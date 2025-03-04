import * as React from 'react';

import { Autocomplete, Box, Card, CardContent, List, ListItem, ListItemText, Paper, Stack, TextField, Typography } from '@mui/material';

import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';

type ChatMessage = {
  role: string;
  content: string;
  sources?: Array<any>;
};

const categoryOptions = [
  {
    id: '0c4cd936-a251-4366-8b8c-38942db944d5',
    label: 'Industrial Sector',
  },
  {
    id: '0c96428e-3946-48e2-bc49-c1b57f41253b',
    label: 'Professional Sector',
  },
  {
    id: 'd3d8f1da-0ef0-4a15-b410-139da4fa8715',
    label: 'Healthcare Sector',
  }
];

export default function ChatPage() {
  const [chatLog, setChatLog] = React.useState<Array<ChatMessage>>([]);
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const [categorySelected, setCategorySelected] = React.useState<{ id: string, label: string } | null>(null);
  const [chatboxInput, setChatboxInput] = React.useState<string>("");

  // Setup automatic scrolling
  React.useEffect(() => {
    // Scroll to bottom
    window.scrollTo(0, document.body.clientHeight);
  }, [chatLog]);

  React.useEffect(() => {
    // Return on empty query
    if (searchQuery.length == 0) {
      return;
    }

    // Append to chat log
    let human_query: ChatMessage = {
      role: "human",
      content: chatboxInput,
    }
    setChatLog((prev) => [...prev, human_query]);

    // Clear query input
    setChatboxInput("");

    // Send query to server for processing
    fetch(
      //'http://127.0.0.1:8000/api/v1/chats',
      `${process.env.NODE_ENV == 'development' ? 'http://localhost:8000' : ''}/api/v1/chats`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'WorkChat' },
        body: JSON.stringify({
          "category": categorySelected,
          "chats": [...chatLog, human_query]
        })
      }
    )
      .then((response) => response.json())
      .then((response) => {
        // Save message on successful response
        if (response.success) {
          let ai_response: ChatMessage = {
            role: 'ai',
            content: response.body.response,
            sources: response.body.sources,
          };
          setChatLog((prev) => [...prev, ai_response]);
        } else {
          throw new Error(response);
        };
      })
      .catch((err) => {
        console.error(err);
        let ai_response: ChatMessage = {
          role: 'ai',
          content: "An error has occured. Please try again!",
        };
        setChatLog((prev) => [...prev, ai_response]);
      })
      .finally(() => {
        // Cleanup
        setSearchQuery("");
      });
  }, [searchQuery]);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: {
          sm: '100%',
          md: '1000px',
        },
      }}
    >
      {/* Heading */}
      <Typography variant="h5" sx={{ mb: 2 }}>
        Chat
      </Typography>

      {/* Chat character customisations */}
      <Autocomplete
        disablePortal
        options={categoryOptions}
        sx={{ width: 300, mb: 2 }}
        getOptionLabel={(option) => option.label}
        renderInput={(params) => <TextField {...params} label="Category" />}
        value={categorySelected}
        onChange={(event, newValue) => {
          setCategorySelected(newValue);
        }}
      />

      {/* Chat log dialogues */}
      <Stack
        spacing={2}
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          mb: 20,
        }}
      >
        {chatLog.map((chat, i) => (
          <Card
            key={i.toString()}
            variant="outlined"
            sx={{
              width: 'calc(100% - 3em)',
              alignSelf: `${chat.role != 'human' && 'flex-end'}`
            }}
          >
            <CardContent>
              <Typography
                variant="body1"
                whiteSpace="preserve"
              >
                {chat.content}
              </Typography>

              {(chat?.sources ?? []).length > 0
                && !chat.content.toLowerCase().match("I was unable to find any information on the topic. Please contact the Bid Management team".toLowerCase())
                && <React.Fragment>
                  <br />
                  <Typography>
                    Sources<br />
                  </Typography>

                  <List
                    dense
                    disablePadding
                  >
                    {(chat?.sources ?? []).map((s, i) => (
                      <ListItem
                        key={`source_item_${i}`}
                      >
                        <ListItemText
                          primary={s[0][1]}
                          secondary={s[1].map((v: number) => (v.toFixed(5).toString())).join(", ")}
                        />
                      </ListItem>
                    ))
                    }
                  </List>
                </React.Fragment>
              }
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Search bar */}
      <Paper
        elevation={10}
        sx={{
          display: 'flex',
          position: 'fixed',
          left: '0',
          bottom: '0',
          width: '100%',
          justifyContent: 'center',
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{
            width: '100%',
            maxWidth: {
              sm: '100%',
              md: '1000px'
            },
            mx: 2,
            my: 2,
            alignItems: 'flex-end',
          }}
        >
          <DeleteIcon
            sx={
              (theme) => ({
                color: theme.palette.error.main,
              })
            }
            onClick={(event) => {
              setChatLog([]);
            }}
          />

          <TextField
            multiline
            maxRows={15}
            sx={{
              flexGrow: '1',
              minWidth: '10em',
            }}
            value={chatboxInput}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setChatboxInput(event.target.value);
            }}
          />

          <SendIcon
            color="primary"
            onClick={(event) => {
              if (chatboxInput.length == 0) {
                return;
              }
              // Set search query
              setSearchQuery(chatboxInput);
            }}
          />

        </Stack>
      </Paper>
    </Box>
  )
};
