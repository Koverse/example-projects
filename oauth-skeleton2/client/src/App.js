import React from 'react';
//import ClientOAuth2 from "client-oauth2";
import {AuthContextProvider} from "./components/Auth/AuthContext";
import PageRouter from './Router'

//axios.defaults.withCredentials = true;

function App() {

  return (
    <AuthContextProvider>
      <PageRouter />
    </AuthContextProvider>
    
    
  );
}

export default App;
