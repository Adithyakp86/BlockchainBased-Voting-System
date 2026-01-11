import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Registration from "./Registration/Registration";
import Voting from "./Voting/Voting";
import Results from "./Results/Results";
import NavigationUser from "./Navbar/NavigationUser";

function UserPage(props) {
  const [tab, setTab] = useState("registration");
  const location = useLocation();

  // Check for query parameters to set the initial tab
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.has('voting')) {
      setTab("voting");
    } else if (queryParams.has('results')) {
      setTab("results");
    }
    // Default to registration tab if no query params
  }, [location.search]);

  return (
    <>
      <NavigationUser />
      <div style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <button 
            className={tab === "registration" ? "btn btn-primary" : "btn btn-outline"}
            onClick={() => setTab("registration")}
            style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer" }}
          >
            Registration
          </button>
          <button 
            className={tab === "voting" ? "btn btn-success" : "btn btn-outline"}
            onClick={() => setTab("voting")}
            style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer" }}
          >
            Voting
          </button>
          <button 
            className={tab === "results" ? "btn btn-info" : "btn btn-outline"}
            onClick={() => setTab("results")}
            style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer" }}
          >
            Results
          </button>
        </div>
        <div>
          {tab === "registration" && (
            <Registration {...props} hideNavbar={true} />
          )}
          {tab === "voting" && (
            <Voting {...props} hideNavbar={true} />
          )}
          {tab === "results" && (
            <Results {...props} hideNavbar={true} />
          )}
        </div>
      </div>
    </>
  );
}

export default UserPage;