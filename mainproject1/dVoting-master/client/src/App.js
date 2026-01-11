import React, { Component } from "react";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";

import Home from "./component/Home";
import ElectionList from "./component/ElectionList";
import RegistrationMulti from "./component/Registration/RegistrationMulti";
import ResultsMulti from "./component/Results/ResultsMulti";

import Voting from "./component/Voting/Voting";
import Results from "./component/Results/Results";
import Registration from "./component/Registration/Registration";

import AddCandidate from "./component/Admin/AddCandidate/AddCandidate";
import Verification from "./component/Admin/Verification/Verification";
import test from "./component/test";
import UserPage from "./component/UserPage";
import UserHome from "./component/UserHome";
// import StartEnd from "./component/Admin/StartEnd/StartEnd";

import Footer from "./component/Footer/Footer";

import "./App.css";

export default class App extends Component {
  render() {
    return (
      <div className="App">
        <Router>
          <Switch>
            <Route exact path="/" component={Home} />
            <Route exact path="/elections" component={ElectionList} />
            <Route exact path="/registrations" component={RegistrationMulti} />
            <Route exact path="/results" component={ResultsMulti} />
            <Route exact path="/AddCandidate" component={AddCandidate} />
            <Route path="/addcandidate/:address" component={AddCandidate} />
            <Route exact path="/Voting" component={Voting} />
            <Route path="/voting/:address" component={Voting} />
            <Route exact path="/Results" component={Results} />
            <Route path="/results/:address" component={Results} />
            <Route exact path="/Registration" component={Registration} />
            <Route path="/registration/:address" component={Registration} />
            <Route exact path="/Verification" component={Verification} />
            <Route exact path="/test" component={test} />
            <Route path="/user" component={UserPage} />
            <Route path="/userhome" component={UserHome} />
            <Route exact path="*" component={NotFound} />
          </Switch>
        </Router>
        <Footer />
      </div>
    );
  }
}

class NotFound extends Component {
  render() {
    return (
      <div className="container-main">
        <div className="container-item center-items" style={{textAlign: 'center', padding: '4rem 2rem'}}>
          <div style={{fontSize: '6rem', marginBottom: '1rem'}}>🔍</div>
          <h1 style={{marginBottom: '1rem'}}>Page Not Found</h1>
          <p style={{color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem'}}>
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link
            to="/"
            className="btn btn-primary"
            style={{textDecoration: 'none'}}
          >
            <i className="fas fa-home"></i>
            Go Home
          </Link>
        </div>
      </div>
    );
  }
}