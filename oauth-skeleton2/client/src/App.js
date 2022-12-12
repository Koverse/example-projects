import React from 'react';
import {AuthContextProvider} from "./components/Auth/AuthContext";
import PageRouter from './Router'

function App() {

  return (
    <AuthContextProvider>
      <PageRouter />
    </AuthContextProvider>
    
    
  );
}

export default App;
