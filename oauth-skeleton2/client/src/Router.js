import React, {useContext} from 'react';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LoginPage from './components/Login/Login';
import Homepage from './components/Homepage/Homepage';
import AuthCheck from './components/AuthCheck/AuthCheck';
import AuthContext from "./components/Auth/AuthContext";

function App() {

  // use this context file to access loggedIn state globally
  const {loggedIn} = useContext(AuthContext);

  // check logged in state
  console.log("LoggedInState: ")
  console.log(loggedIn)

  return (
      // create path routes for all the seperate pages to be accessed depending on loggedIn state
      <Router>
        <Routes>
          {loggedIn === false &&
          <>
          {/* initial page seen when accessing url */}
          <Route path='/' element={<LoginPage />} />
          {/* middle-man page used to  */}
          <Route path='/auth/koverse' element={<AuthCheck/>} />
          </>
          
          }
          {/* Homepage only accessible if the user is logged in - this is where we can successfully make API calls*/}
          <Route path='/auth/success' element={<Homepage/>} />
      
        </Routes>
      </Router>
    
    
  );
}

export default App;
