import React, {useContext, useEffect} from 'react';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LoginPage from './components/Login/Login';
import Homepage from './components/Homepage/Homepage';
import AuthCheck from "./components/AuthCheck/AuthCheck";
import axios from 'axios';


import AuthContext from "./components/Auth/AuthContext";

function App() {

   const {loggedIn} = useContext(AuthContext);
   console.log("LoggedInState: ")
   console.log(loggedIn)


  return (
      <Router>
        <Routes>
          {loggedIn === false &&
          <>
          <Route path='/' element={<LoginPage />} />
          <Route path='/auth/koverse' element={<AuthCheck/>} />
          </>
          
        }
        
        <Route path='/auth/success' element={<Homepage/>} />
      
        </Routes>
      </Router>
    
    
  );
}

export default App;
