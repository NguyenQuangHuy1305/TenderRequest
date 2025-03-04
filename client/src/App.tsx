import * as React from 'react';

import { BrowserRouter, Route, Routes } from 'react-router';

import { Box, Stack } from '@mui/material';

import AppNavbar from './components/AppNavbar';
import Header from './components/Header';
import ChatPage from './components/chats/Chat';
import FilesPage from './components/files/FilesPage';

export default function App() {
  return (
    <BrowserRouter>
      <Box sx={{ display: 'flex' }}>
        <AppNavbar />
        { /* Main content */}
        <Box
          component="main"
          sx={(theme) => ({
            flexGrow: 1,
            overflow: 'auto',
          })}
        >
          <Stack
            spacing={2}
            sx={{
              alignItems: 'center',
              mx: 3,
              pb: 5,
              mt: { xs: 8, md: 0 },
            }}
          >
            <Header />

            <Routes>
              <Route
                path="/"
                element={<ChatPage />}
              />

              <Route
                path="/files"
                element={<FilesPage />}
              />
            </Routes>
          </Stack>
        </Box>
      </Box>
    </BrowserRouter >
  );
}
