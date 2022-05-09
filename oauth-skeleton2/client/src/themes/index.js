import { red, blueGrey, grey } from "@material-ui/core/colors";
import { createTheme } from "@material-ui/core/styles";

export const defaultTheme = createTheme({
  palette: {
    primary: {
      main: grey[500],
    },
    secondary: {
      main: grey.A700,
    },
    error: {
      main: red.A400,
    },
    background: {
      default: "#F2F2F2",
    },
  },
});
