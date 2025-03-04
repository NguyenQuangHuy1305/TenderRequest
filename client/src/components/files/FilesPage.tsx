import * as React from 'react';

import { Avatar, Box, Button, IconButton, List, ListItem, ListItemAvatar, ListItemText, Stack, Typography } from '@mui/material';

import { styled } from '@mui/material/styles';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import UpdateIcon from '@mui/icons-material/Update';

/**
 * Format bytes as human-readable text. "Borrowed" from https://stackoverflow.com/a/14919494
 *
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 *
 * @return Formatted string.
 */
function readableFileSize(bytes: number, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


  return bytes.toFixed(dp) + ' ' + units[u];
}

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

type BlobFile = {
  name: string;
  size: number;
  last_modified: string;
  creation_time: string;
  content_md5: string;
};

export default function FilesPage() {
  const [storedFiles, setStoredFiles] = React.useState<Array<BlobFile>>([]);
  const [uploadFilesStatus, setUploadFilesStatus] = React.useState({ total: NaN, done: NaN });

  const [staleStoredFiles, setStaleStoredFiles] = React.useState(true);

  React.useEffect(() => {
    // Check if data is stale
    if (!staleStoredFiles) {
      return;
    }

    // Fetch file list
    fetch(
      // http://127.0.0.1:8000/api/v1/files/list
      `${process.env.NODE_ENV == 'development' ? 'http://localhost:8000' : ''}/api/v1/files/list`,
      {
        method: 'GET',
        headers: { 'User-Agent': 'WorkChat' },
      }
    )
      .then((response) => response.json())
      .then((response) => {
        if (response.success) {
          setStoredFiles(response.body);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setStaleStoredFiles(false));
  }, [staleStoredFiles]);

  React.useEffect(() => {
    // Mark as stale once all files have been uploaded
    if (uploadFilesStatus.total == uploadFilesStatus.done) {
      setStaleStoredFiles(true);
    };
  }, [uploadFilesStatus]);

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
      <Typography variant="h5" sx={{ mb: 1 }}>
        Tools
      </Typography>

      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 2 }}
      >
        {/* Upload file button */}
        <Button
          component="label"
          role={"button"}
          variant="contained"
          tabIndex={-1}
          startIcon={<CloudUploadIcon />}
          color="primary"
        >
          Upload files
          <VisuallyHiddenInput
            type="file"
            onChange={(event) => {
              // Add to blob storage
              const files = event.target.files ?? [];

              if (files.length == 0) {
                return;
              } else {
                setUploadFilesStatus({
                  total: files.length,
                  done: 0,
                });
              };

              for (let i = 0; i < files.length; i++) {
                const form = new FormData();
                form.append('file', files[i]);

                fetch(
                  // http://127.0.0.1:8000/api/v1/files/upload
                  `${process.env.NODE_ENV == 'development' ? 'http://localhost:8000' : ''}/api/v1/files/upload`,
                  {
                    method: 'POST',
                    headers: {
                      'User-Agent': 'WorkChat',
                    },
                    body: form,
                  }
                )
                  .then((response) => response.json())
                  .then((response) => {
                    // TODO display status
                    if (response.success) {
                      true;
                    }
                  })
                  .catch((err) => console.error(err))
                  .finally(() => setUploadFilesStatus((u) => ({ ...u, done: u.done + 1 })));
              };
            }}
            multiple
          />
        </Button>

        {/* Run indexer button */}
        <Button
          component="label"
          role={"button"}
          variant="contained"
          tabIndex={-1}
          startIcon={<UpdateIcon />}
          color="secondary"
          onClick={(event) => {
            // Run indexer
            fetch(
              // http://127.0.0.1:8000/api/v1/indexer/run
              `${process.env.NODE_ENV == 'development' ? 'http://localhost:8000' : ''}/api/v1/indexer/run`,
              {
                method: 'POST',
                headers: { 'User-Agent': 'WorkChat' },
              }
            )
              .then((response) => response.json())
              .then((response) => {
                // TODO display status
                if (response.success) {
                  true;
                }
              })
              .catch((err) => console.error(err));
          }}
        >
          Run indexer
        </Button>
      </Stack>

      <Typography variant="h5">
        Knowledge Store
      </Typography>

      {/* File list */}
      <List dense sx={{ mb: 2, pt: 0 }}>
        {storedFiles.map((file) => (
          <ListItem
            key={file.name}
            secondaryAction={
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={(event) => {
                  // Remove item from list
                  setStoredFiles(storedFiles.filter(f => f.name != file.name));

                  // Remove from blob storage
                  fetch(
                    // http://127.0.0.1:8000/api/v1/files/lorem-ipsum.txt/delete
                    `${process.env.NODE_ENV == 'development' ? 'http://localhost:8000' : ''}/api/v1/files/${file.name}/delete`,
                    {
                      method: 'POST',
                      headers: { 'User-Agent': 'WorkChat' },
                    }
                  )
                    .then((response) => response.json())
                    .then((response) => {
                      // TODO display status
                      if (response.success) {
                        true;
                      }
                    })
                    .catch((err) => console.error(err));
                }}
              >
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemAvatar>
              <Avatar>
                <DescriptionIcon />
              </Avatar>
            </ListItemAvatar>

            <ListItemText
              primary={file.name}
              secondary={`Created: ${(new Date(Date.parse(file.creation_time))).toLocaleString('en-AU').split(',').join('')} | Size: ${readableFileSize(file.size, true)}`}
            />
          </ListItem>
        ))
        }
      </List>
    </Box>
  );
};
