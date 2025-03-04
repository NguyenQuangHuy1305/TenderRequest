import logging
import os
from collections import defaultdict
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, List, Optional, Union

import dotenv

from fastapi import APIRouter, Body, Depends, FastAPI, File, Request, UploadFile, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from pydantic import BaseModel, Field

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

from langchain_community.vectorstores.azuresearch import AzureSearch

from langchain_openai import AzureChatOpenAI, AzureOpenAIEmbeddings

import azure
from azure.core.credentials import AzureKeyCredential
from azure.search.documents.indexes import SearchIndexerClient
from azure.storage.blob import BlobClient, BlobServiceClient, BlobType, ContainerClient

from azure.search.documents.indexes.models import (
    ScoringProfile,
    SearchableField,
    SearchField,
    SearchFieldDataType,
    SimpleField,
    TextWeights,
)

import openai

import prompts

# Global constants
STATIC_DIR = Path("./static")

# Global variables
config: dict = {}
llm: AzureChatOpenAI
vector_store: AzureSearch
search_indexer_client: SearchIndexerClient
blob_service_client: BlobServiceClient
container_client: ContainerClient

# Logging
logger = logging.getLogger("uvicorn.error")
logger.setLevel(logging.DEBUG)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Sets up FastAPI server"""
    # Show working directory
    logger.debug(f"Current directory: {os.getcwd()}")

    # Load environment variables
    dotenv.load_dotenv()

    # Global variables
    global config
    global llm
    global vector_store
    global search_indexer_client
    global blob_service_client
    global container_client

    # Global config
    config["azure_openai_api_key"] = os.getenv("AZURE_OPENAI_API_KEY")
    config["azure_openai_api_version"] = os.getenv("AZURE_OPENAI_API_VERSION")
    config["azure_openai_endpoint"] = os.getenv("AZURE_OPENAI_API_ENDPOINT")
    config["azure_openai_deployment_name"] = os.getenv(
        "AZURE_OPENAI_DEPLOYMENT_NAME"
    )

    config["azure_openai_embeddings_endpoint"] = os.getenv(
        "AZURE_OPENAI_EMBEDDINGS_ENDPOINT")
    config["azure_openai_embeddings_version"] = os.getenv(
        "AZURE_OPENAI_EMBEDDINGS_VERSION")

    config["azure_ai_search_api_endpoint"] = os.getenv(
        "AZURE_AI_SEARCH_API_ENDPOINT")
    config["azure_ai_search_api_key"] = os.getenv("AZURE_AI_SEARCH_API_KEY")
    config["azure_ai_search_index_name"] = os.getenv(
        "AZURE_AI_SEARCH_INDEX_NAME")

    config["azure_blob_storage_account"] = os.getenv(
        "AZURE_BLOB_STORAGE_ACCOUNT")
    config["azure_blob_storage_account_api_key"] = os.getenv(
        "AZURE_BLOB_STORAGE_ACCOUNT_API_KEY")
    config["azure_blob_storage_container_docstore"] = os.getenv(
        "AZURE_BLOB_STORAGE_CONTAINER_DOCSTORE")

    # Configure LLM
    llm = AzureChatOpenAI(
        api_key=config["azure_openai_api_key"],
        azure_deployment=config["azure_openai_deployment_name"],
        azure_endpoint=config["azure_openai_endpoint"],
        api_version=config["azure_openai_api_version"],
    )

    # Configure vector store
    embeddings = AzureOpenAIEmbeddings(
        api_key=config["azure_openai_api_key"],
        azure_endpoint=config["azure_openai_embeddings_endpoint"],
        openai_api_version=config["azure_openai_embeddings_version"],
        # azure_deployment="AE-WN1-BTChatBot-1-OAI",
    )
    index_fields = [
        SimpleField(
            name="id",
            type=SearchFieldDataType.String,
            key=True,
            filterable=True,
        ),
        SearchableField(
            name="text",
            type=SearchFieldDataType.String,
            searchable=True,
        ),
        SearchField(
            name="textVector",
            type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
            searchable=True,
            vector_search_dimensions=len(
                embeddings.embed_query("lorem ipsum")),  # Should be 3072
            vector_search_profile_name="vector-config-hnsw-1",
        ),
    ]
    # Vector store has default fields set e.g. content, content_vector
    vector_store = AzureSearch(
        azure_search_key=config["azure_ai_search_api_key"],
        azure_search_endpoint=config["azure_ai_search_api_endpoint"],
        index_name=config["azure_ai_search_index_name"],
        embedding_function=embeddings.embed_query,
        fields=index_fields,
    )

    # Configure Azure AI Search client
    search_indexer_client = SearchIndexerClient(
        endpoint=config["azure_ai_search_api_endpoint"],
        credential=AzureKeyCredential(config["azure_ai_search_api_key"]),
    )

    # Configure Azure Blob Service client
    blob_service_client = BlobServiceClient(
        account_url=f"https://{config["azure_blob_storage_account"]
                               }.blob.core.windows.net",
        credential=config["azure_blob_storage_account_api_key"],
    )

    # Get a Container client for the docstore container
    container_client = blob_service_client.get_container_client(
        config["azure_blob_storage_container_docstore"])

    # Cleanup processes
    yield
    # Azure Search client
    search_indexer_client.close()


# Load FastAPI server
app = FastAPI(
    lifespan=lifespan,
    dependencies=[]
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()


@app.get("/api/v1")
def read_api_statuses():
    """Returns the API statuses"""
    return {
        "success": True,
        "body": {
            "status": 1,
        }
    }


@app.get("/api/v1/users/headers")
async def read_request_headers(request: Request):
    """Returns information about the user"""
    return {
        "success": True,
        "body": {
            "headers": request.headers,
        }
    }


@app.get("/api/v1/files/list")
def list_files():
    """Lists files currently stored"""
    blobs = container_client.list_blobs()

    blobs_list = [
        {
            "name": blob.name,
            "size": blob.size,  # bytes
            "last_modified": blob.last_modified,
            "creation_time": blob.creation_time,
            "content_md5": blob.content_settings.content_md5.hex() if blob.content_settings.content_md5 else None,
        }
        for blob in blobs
    ]

    return {
        "success": True,
        "body": blobs_list,
    }


@app.post("/api/v1/files/{file_name}/delete")
def delete_file(file_name: str):
    """Delete the file from blob storage"""
    blob_client: BlobClient = blob_service_client.get_blob_client(
        container=config["azure_blob_storage_container_docstore"],
        blob=file_name,
    )

    if blob_client.exists():
        blob_client.delete_blob()
        return {
            "success": True,
            "msg": "File successfully deleted.",
        }
    else:
        return {
            "success": False,
            "msg": "File does not exist.",
        }


@app.post("/api/v1/files/upload")
def upload_file(file: UploadFile):
    """Upload a file to blob storage"""
    # Check for file
    if not file.file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file parameter in the body",
        )

    try:
        blob_client: BlobClient = blob_service_client.get_blob_client(
            container=config["azure_blob_storage_container_docstore"],
            blob=file.filename,
        )

        blob_client.upload_blob(
            data=file.file.read(),
            blob_type=BlobType.BLOCKBLOB,
            overwrite=False,
        )

    except azure.core.exceptions.ResourceExistsError:
        return {
            "success": False,
            "msg": "File name already taken",
        }

    return {
        "success": True,
        "msg": "File was successfully uploaded",
    }


@app.post("/api/v1/indexer/run")
def run_indexer():
    """Run the search indexer"""
    search_indexer_client.run_indexer("workchat-document-indexer")
    return {
        "success": True,
    }


class Chat(BaseModel):
    role: str
    content: str


class ChatCategory(BaseModel):
    id: str
    label: str


class UserQuery(BaseModel):
    category: Optional[ChatCategory] = None
    chats: List[Chat]


@app.post("/api/v1/chats")
def process_chat(user_query: UserQuery):
    """Uses the LLM to answer the query"""
    # Extract user query
    if len(user_query.chats) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid chat query"
        )
    query = user_query.chats[-1].content
    user_query_history = [
        (c.role, c.content) for c in user_query.chats[:-1]
        if c.role in ("system", "human", "ai") and c.content
    ]

    # Query for documents
    vector_store_retriever = vector_store.as_retriever(
        k=10,
        search_type="hybrid_score_threshold",  # RRF ranking
        search_kwargs={
            # Upper limit is bound by number of fused queries
            "score_threshold": 0
        }
    )
    documents_retrieved = vector_store_retriever.invoke(query)
    sources_metadata = defaultdict(list)

    # Add the documents' metadata to the sources
    for d in documents_retrieved:
        k = ("document", d.metadata["title"])
        v = d.metadata["@search.score"]
        sources_metadata[k].append(v)

    # Flatten into sorted list. Sort by max(item.value())
    sources_metadata_items = sorted(
        list(sources_metadata.items()),
        key=lambda v: max(v[1]),
        reverse=True
    )

    # Prompt engineering
    system_prompt = """
    You are an experience and helpful tender writer working for WorkPac.
    Consider the following style guides, terminology and context while
    answering the response. Use ten sentences maximum and keep the answer as
    concise as possible unless asked otherwise.

    If relevant context or no context can be found, do not make up any
    information on that topic. Instead, respond with the following line:
    "I was unable to find any information on the topic. Please contact the Bid Management team."

    Style Guide: {style_guide}

    Terminology: {terminology}

    Context: {context}

    Question: {question}
    Answer:
    """
    style_guide = prompts.style_guides["general"]["content"] + '\n'
    terminology_guide = prompts.style_guides["terminology"]["content"] + '\n'
    if user_query.category:
        category_label = user_query.category.label
        category_style_guide = prompts.style_guides[user_query.category.id]
        style_guide += f"The user's questions relate to tenders in the \"{
            category_label}\".\n{category_style_guide}\n"

    prompt_template = ChatPromptTemplate.from_messages(
        [
            ("system", system_prompt),
            # Set a chat history of 10/2 RAG cycles
            MessagesPlaceholder("history", n_messages=10),
            ("human", "{question}"),
        ]
    )

    rag_chain = (
        {
            "history": lambda _: user_query_history,
            "style_guide": lambda _: style_guide,
            "terminology": lambda _: terminology_guide,
            "context": lambda _: documents_retrieved,
            "question": RunnablePassthrough(),
        }
        | prompt_template
        | llm
        | StrOutputParser()
    )

    # Process user query with chain
    try:
        rag_response = rag_chain.invoke(query)
    except openai.RateLimitError:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="ChatCompletions_Create Operation under Azure OpenAI have exceeded the token rate limit. Please try again after 60 seconds."
        )

    return {
        "success": True,
        "body": {
            "response": rag_response,
            "sources": sources_metadata_items,
        }
    }


@router.get('/{path:path}')
async def frontend_handler(path: str):
    fp = STATIC_DIR / path
    if not fp.exists():
        fp = STATIC_DIR / "index.html"
    elif path == "":
        fp = STATIC_DIR / "index.html"

    return FileResponse(fp)
app.include_router(router)

# Setup static file serving
# app.mount("/", StaticFiles(directory="./static", html=True), name="static")
