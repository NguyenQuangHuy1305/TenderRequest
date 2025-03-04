import * as React from 'react';

import { useLocation } from 'react-router';

import { Stack } from '@mui/material';

import NavbarBreadcrumbs from './NavbarBreadcrumbs';

export default function Header() {
  const location = useLocation();

  return (
    <Stack
      direction="row"
      sx={{
        display: { xs: 'none', md: 'flex' },
        width: '100%',
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'space-between',
        maxWidth: { sm: '100%', md: '1700px' },
        pt: 1.5,
      }}
      spacing={2}
    >
      <NavbarBreadcrumbs
        values={location.pathname.substring(1).split('/').filter(s => s.length > 0)}
      />
      <Stack direction="row" sx={{ gap: 1 }}>
      </Stack>
    </Stack>
  );
}
