import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { ThemeProvider } from "@material-ui/styles";
import CssBaseline from "@material-ui/core/CssBaseline";
import { defaultTheme } from "./themes";


ReactDOM.render(
  <React.StrictMode>
        <ThemeProvider theme={defaultTheme}>
          <CssBaseline />
              <App />
        </ThemeProvider>
  </React.StrictMode>,
  document.getElementById('root')
);