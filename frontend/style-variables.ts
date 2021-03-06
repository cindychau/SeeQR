/**
 * This file contains all reusable variables for styling in styled-components
 * Individual variables should be named exports
 */
import { ListItem, List } from '@material-ui/core';
import { createMuiTheme } from '@material-ui/core/styles';
import styled from 'styled-components';

// interface PaletteColor {
//   light?: string;
//   main: string;
//   dark?: string;
//   contrastText?: string;
// }
// previous
export const bgColor = '#2b2d35';
export const textColor = '#c6d2d5';
// @import url('https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap');
// @import url('https://fonts.googleapis.com/css2?family=PT+Mono&display=swap');

// greens
export const greenBlack = '#45584d';
export const greenDark = '#11774e';
export const greenPrimary = '#57a777';
export const greenLight = '#8bbb9b';
export const greenLighter = '#acccbb';
export const greenLightest = '#ccdad4';

// greys
export const greyDarkest = '#191919';
export const greyPrimary = '#818584';
export const greyLight = '#aab6af';
export const greyLightest = '#dfe0e2';

// Icons and Buttons
export const selectedColor = greenPrimary;
export const hoverColor = greenPrimary;

// theme to override Mui defaults
export const MuiTheme = createMuiTheme({
  palette: {
    primary: {
      light: greenLight,
      main: selectedColor,
      dark: greenDark,
    },
    secondary: {
      light: greyLightest,
      main: greyLight,
    },
  },
  overrides: {
    MuiIconButton: {
      root: {
        color: textColor,
        '&:hover': {
          color: hoverColor,
        },
      },
    },
    MuiTooltip: {
      tooltip: {
        fontSize: '1em',
      },
    },
  },
});

// Sizes
export const sidebarWidth = '300px';

interface SidebarListItemProps {
  customSelected: boolean;
}

export const SidebarList = styled(List)`
  padding: 0;
  width: 100%;
`

/**
 * Sidebar List item. Designed for dark bg.
 * Takes boolean in customSelected prop to style selected item
 */
export const SidebarListItem = styled(ListItem)`
  color: ${({ customSelected }: SidebarListItemProps) =>
    customSelected ? selectedColor : textColor};
  background: transparent;
  border-bottom: 1px solid transparent;
  border-top: 1px solid transparent;
  width: 100%;

  &:hover {
    background: transparent;
    border-bottom: 1px solid ${hoverColor};
    border-top: 1px solid ${hoverColor};
  }
`;

// // typography
// $font-stack: 'PT Sans', sans-serif;
// $font-input: 'PT Mono', monospace;
// $p-weight: 100;
// $title-weight: 300;
// $default-text: 1em;

// // colors
// $background-modal-darkmode: #30353a;
// $background-lightmode: #9abacc;
// $primary-color-lightmode: #1a1a1a;
// $primary-color-darkmode: #c6d2d5;
// $border-darkmode: #444c50;
// $button-darkmode: #596368;
// $background-darkmode-darker: #292a30;
// $mint-green: #6cbba9;
