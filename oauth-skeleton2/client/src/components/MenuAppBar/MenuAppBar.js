import React, { useState, useContext, useEffect} from "react";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import AccountCircle from "@material-ui/icons/AccountCircle";
import MenuIcon from "@material-ui/icons/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import Menu from "@material-ui/core/Menu";
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import AuthContext from "../Auth/AuthContext";

const styles = makeStyles((theme) => ({
  root: {
    zIndex: theme.zIndex.drawer + 1,
  },
  roomRight: {
    marginRight: theme.spacing(1),
  },
  title: {
    flexGrow: 1,
  },
}));

const MenuAppBar = ({ user, toggleNavDrawer }) => {

  const navigate = useNavigate();    
  const {loggedIn} = useContext(AuthContext);
  const [userEmail, setUserEmail] = useState('');

  
  const logout = () => {
    console.log("Remove token and log out");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    //call logout endpoint
    const loggedInState = axios.get("http://localhost:3001/logout");
    console.log("loggedInState: " + loggedInState)

    navigate("/");
    window.location.reload();
  }

  const classes = styles();
  const [anchorEl, setAnchorEl] = useState(null);

  const open = Boolean(anchorEl);

  const handleMenu = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleOnClick = () => {
    // logout
    logout();
    handleClose();
  };

  useEffect(() => {
    // get user login credentials
    console.log("test")

    const accessToken = localStorage.getItem("token")
    console.log(accessToken)
    axios.get('http://localhost:3001/getCred', 
    {params: {token: accessToken}})
    .then(res => 
      {
        console.log("received credentials: ")
        console.log(res)
        // save user in local storage in order to refer to access token
        localStorage.setItem("user", JSON.stringify(res.data))
        // store username and email
        setUserEmail(res.data.user.email);

      })
    .catch(err => {
        console.log("ttest2")
        console.log(err)
        console.log("Unable to get user credentials")
        logout(); // reactivate once authentication is working again
    })
   
  }, [])

  return (
    <AppBar position="fixed" className={classes.root} elevation={0}>
      <Toolbar>
        {/* disabled menu drawer toggle */}
        {loggedIn && false && (
          <IconButton
            edge="start"
            className={classes.roomRight}
            color="inherit"
            aria-label="nav-menu"
            onClick={toggleNavDrawer}
          >
            <MenuIcon />
          </IconButton>
        )}
        <Typography color="inherit" variant="h6" className={classes.title}>
          OAuth Skeleton
        </Typography>
        {loggedIn && (
          <>
            <Typography variant="caption">
                {userEmail}
            </Typography>
            <IconButton
              aria-label="Account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={open}
              onClose={handleClose}
            >
              <MenuItem onClick={handleOnClick}>Logout</MenuItem>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

MenuAppBar.propTypes = {
  user: PropTypes.object,
  toggleNavDrawer: PropTypes.func,
};

export default MenuAppBar;
