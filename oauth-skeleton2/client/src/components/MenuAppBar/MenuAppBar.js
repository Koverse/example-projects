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

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    //call logout endpoint
    const loggedInState = axios.get("/logout");
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

  return (
    <AppBar position="fixed" className={classes.root} elevation={0}>
      <Toolbar>
        {/* disabled menu drawer toggle */}
        {user && false && (
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
        {user && (
          <>
            <Typography variant="caption">
                {user.email}
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
