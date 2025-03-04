import * as React from 'react';

import { Breadcrumbs, breadcrumbsClasses, styled, Typography } from '@mui/material';

import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';

const StyledBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
  margin: theme.spacing(1, 0),
  [`& .${breadcrumbsClasses.separator}`]: {
    //color: (theme.vars || theme).palette.action.disabled,
    margin: 1,
  },
  [`& .${breadcrumbsClasses.ol}`]: {
    alignItems: 'center',
  },
}));

export declare interface NavbarBreadcrumbsProps {
  values?: Array<string>;
};

export default function NavbarBreadcrumbs(props: NavbarBreadcrumbsProps) {
  const { values } = props;

  return (
    <StyledBreadcrumbs
      aria-label="breadcrumb"
      separator={<NavigateNextRoundedIcon fontSize="small" />}
    >
      <Typography variant="body1">
        WorkChat
      </Typography>

      {(values ?? []).slice(0, -1).length > 0 && values?.slice(0, -1).map((s) => (
        <Typography variant="body1">
          {s}
        </Typography>
      ))}

      <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 600 }}>
        {(values ?? []).slice(-1).length > 0 ?
          `${values?.slice(-1)[0].substring(0, 1).toUpperCase()}${values?.slice(-1)[0].substring(1).toLowerCase()}`
          :
          "Home"
        }
      </Typography>
    </StyledBreadcrumbs>
  );
};
