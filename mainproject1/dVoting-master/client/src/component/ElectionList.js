// Node modules
import React, { Component } from "react";
import { Link } from "react-router-dom";

// Components
import Navbar from "./Navbar/Navigation";
import NavbarAdmin from "./Navbar/NavigationAdmin";

// Contract
import getWeb3 from "../getWeb3";
import Election from "../contracts/Election.json";
import ElectionFactory from "../contracts/ElectionFactory.json";

// CSS
import "./Home.css";

export default class ElectionList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ElectionFactoryInstance: undefined,
      account: null,
      web3: null,
      isAdmin: false,
      elections: [], // Array to hold multiple elections
    };
  }

  // refreshing once
  componentDidMount = async () => {
    if (!window.location.hash) {
      window.location = window.location + "#loaded";
      window.location.reload();
    }
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the factory contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedFactoryNetwork = ElectionFactory.networks[networkId];
      const factoryInstance = new web3.eth.Contract(
        ElectionFactory.abi,
        deployedFactoryNetwork && deployedFactoryNetwork.address,
      );
      
      this.setState({
        web3: web3,
        ElectionFactoryInstance: factoryInstance,
        account: accounts[0],
      });

      // Get deployed elections from factory
      const deployedElections = await factoryInstance.methods.getDeployedElections().call();
      
      // Load details for each election
      const elections = [];
      for (let i = 0; i < deployedElections.length; i++) {
        const electionAddress = deployedElections[i];
        const electionContract = new web3.eth.Contract(Election.abi, electionAddress);
        
        // Get election details
        const electionDetails = await electionContract.methods.getElectionDetails().call();
        
        // Get election status
        const start = await electionContract.methods.getStart().call();
        const end = await electionContract.methods.getEnd().call();
        
        // Get candidates for this election
        const candidateCount = await electionContract.methods.getTotalCandidate().call();
        const candidates = [];
        for (let j = 0; j < candidateCount; j++) {
          const candidate = await electionContract.methods.candidateDetails(j).call();
          candidates.push({
            id: candidate.candidateId,
            header: candidate.header,
            slogan: candidate.slogan,
          });
        }
        
        // Only include elections that have been started
        if (start) {
          elections.push({
            address: electionAddress,
            details: {
              adminName: electionDetails.adminName,
              adminEmail: electionDetails.adminEmail,
              adminTitle: electionDetails.adminTitle,
              electionTitle: electionDetails.electionTitle,
              organizationTitle: electionDetails.organizationTitle,
            },
            started: start,
            ended: end,
            candidates: candidates // Add candidates to election data
          });
        }
      }
      
      this.setState({ elections });
      
      // Check if user is admin for any election
      for (let i = 0; i < deployedElections.length; i++) {
        const electionAddress = deployedElections[i];
        const electionContract = new web3.eth.Contract(Election.abi, electionAddress);
        const admin = await electionContract.methods.getAdmin().call();
        if (this.state.account === admin) {
          this.setState({ isAdmin: true });
          break;
        }
      }
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.error(error);
    }
  };

  // End a specific election by address
  endElectionByAddress = async (electionAddress) => {
    try {
      const electionContract = new this.state.web3.eth.Contract(Election.abi, electionAddress);
      
      // Check if the election is started but not ended
      const start = await electionContract.methods.getStart().call();
      const end = await electionContract.methods.getEnd().call();
      
      if (start && !end) {
        await electionContract.methods
          .endElection()
          .send({ from: this.state.account, gas: 1000000 });
        
        alert("Election ended successfully.");
        window.location.reload();
      } else if (!start) {
        alert("Election has not been started yet.");
      } else if (end) {
        alert("Election has already ended.");
      }
    } catch (error) {
      console.error("Error ending election:", error);
      alert("Failed to end election. Check console for details.");
    }
  };

  render() {
    if (!this.state.web3) {
      return (
        <>
          {this.state.isAdmin ? <NavbarAdmin /> : <Navbar />}
          <div className="container-main">
            <div className="container-item center-items" style={{textAlign: 'center', padding: '4rem 2rem'}}>
              <div className="loading" style={{width: '3rem', height: '3rem', marginBottom: '2rem'}}></div>
              <h2 style={{marginBottom: '1rem'}}>Loading Elections</h2>
              <p style={{color: 'var(--text-secondary)'}}>
                Connecting to Blockchain...
              </p>
            </div>
          </div>
        </>
      );
    }
    
    return (
      <>
        {this.state.isAdmin ? <NavbarAdmin /> : <Navbar />}
        <div className="container-main">
          <div className="container-item info">
            <h2 style={{textAlign: 'center', marginBottom: '2rem'}}>
              <i className="fas fa-vote-yea"></i> Available Elections
            </h2>
            
            {this.state.elections.length === 0 ? (
              <div className="container-item center-items">
                <h3>No elections available at the moment</h3>
                <p>Please check back later or contact the administrator</p>
              </div>
            ) : (
              <div className="election-list">
                {this.state.elections.map((election, index) => (
                  <div key={index} className="container-item election-item">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                      <h3 style={{margin: 0, color: 'var(--primary-text)'}}>
                        {election.details.electionTitle}
                      </h3>
                      {election.ended ? (
                        <span className="tag ended">Ended</span>
                      ) : election.started ? (
                        <span className="tag active">Active</span>
                      ) : (
                        <span className="tag inactive">Inactive</span>
                      )}
                    </div>
                    
                    <div style={{marginBottom: '1rem'}}>
                      <p style={{margin: '0.5rem 0', color: 'var(--text-secondary)'}}>
                        <i className="fas fa-building"></i> {election.details.organizationTitle}
                      </p>
                      <p style={{margin: '0.5rem 0', color: 'var(--text-secondary)'}}>
                        <i className="fas fa-user-tie"></i> {election.details.adminName} ({election.details.adminTitle})
                      </p>
                    </div>
                    
                    {/* Display candidates for this election */}
                    {election.candidates.length > 0 && (
                      <div style={{marginBottom: '1rem'}}>
                        <h4 style={{margin: '0.5rem 0', color: 'var(--text-secondary)'}}>Candidates:</h4>
                        <ul style={{paddingLeft: '1.5rem', margin: '0.5rem 0'}}>
                          {election.candidates.map((candidate, idx) => (
                            <li key={idx} style={{margin: '0.25rem 0'}}>
                              {candidate.header}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                      <Link 
                        to={`/voting/${election.address}`} 
                        className="btn btn-primary"
                        style={{textDecoration: 'none'}}
                      >
                        <i className="fas fa-vote-yea"></i> Vote
                      </Link>
                      <Link 
                        to={`/Registration?address=${election.address}`} 
                        className="btn btn-success"
                        style={{textDecoration: 'none'}}
                      >
                        <i className="fas fa-user-plus"></i> Register
                      </Link>
                      <Link 
                        to={`/results/${election.address}`} 
                        className="btn btn-info"
                        style={{textDecoration: 'none'}}
                      >
                        <i className="fas fa-poll"></i> Results
                      </Link>
                      {this.state.isAdmin && election.started && !election.ended && (
                        <button 
                          className="btn btn-danger"
                          onClick={() => this.endElectionByAddress(election.address)}
                          style={{border: 'none', cursor: 'pointer'}}
                        >
                          <i className="fas fa-stop"></i> End Election
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
}