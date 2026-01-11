// Node modules
import React, { Component } from "react";
import { Link } from "react-router-dom";

// Components
import Navbar from "../Navbar/Navigation";
import NavbarAdmin from "../Navbar/NavigationAdmin";
import NotInit from "../NotInit";

// Contract
import getWeb3 from "../../getWeb3";
import Election from "../../contracts/Election.json";
import ElectionFactory from "../../contracts/ElectionFactory.json";

// CSS
import "./Results.css";

export default class Result extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ElectionInstance: undefined,
      ElectionFactoryInstance: undefined,
      account: null,
      web3: null,
      isAdmin: false,
      candidateCount: undefined,
      candidates: [],
      isElStarted: false,
      isElEnded: false,
      electionDetails: {}, // To store election details
      elections: [], // Array to hold multiple elections when accessed directly
      showElectionList: false, // Flag to show election list when no address is provided
      error: null, // Add error state
    };
  }
  componentDidMount = async () => {
    // Check if we're accessing a specific election via URL params or route params
    const urlParams = new URLSearchParams(window.location.search);
    const urlElectionAddress = urlParams.get('address');
    const routeElectionAddress = this.props.match.params.address;
    const electionAddress = urlElectionAddress || routeElectionAddress;
    
    console.log("Election address detection:");
    console.log("  URL param address:", urlElectionAddress);
    console.log("  Route param address:", routeElectionAddress);
    console.log("  Final election address:", electionAddress);
    
    // Only refresh once, and only if we're not viewing a specific election
    if (!window.location.hash && !electionAddress) {
      window.location = window.location + "#loaded";
      window.location.reload();
    }
    try {
      // Get network provider and web3 instance.
      console.log("Initializing Web3...");
      const web3 = await getWeb3();
      console.log("Web3 initialized:", web3);

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();
      console.log("Accounts fetched:", accounts);

      // If no election address is provided, show list of elections
      if (!electionAddress) {
        console.log("No election address provided, loading election list");
        await this.loadElectionList(web3, accounts[0]);
        return;
      } else {
        // Make sure we don't show the election list when viewing specific results
        this.setState({ showElectionList: false });
      }
      
      // Get the contract instance based on the election address from URL params
      const networkId = await web3.eth.net.getId();
      console.log("Network ID:", networkId);
      
      // Use the specific election address
      console.log("Creating contract instance with address:", electionAddress);
      const instance = new web3.eth.Contract(Election.abi, electionAddress);
      console.log("Contract instance created:", instance);

      // Get all data before setting state to avoid multiple re-renders
      // Get total number of candidates
      const candidateCount = await instance.methods.getTotalCandidate().call();
      console.log("Candidate count:", candidateCount);

      // Get start and end values
      const start = await instance.methods.getStart().call();
      const end = await instance.methods.getEnd().call();
      console.log("Start:", start, "End:", end);

      // Get election details
      const electionDetails = await instance.methods.getElectionDetails().call();
      console.log("Election details:", electionDetails);

      // Loading Candidates details
      const candidates = [];
      for (let i = 0; i < candidateCount; i++) {
        const candidate = await instance.methods.candidateDetails(i).call();
        candidates.push({
          id: candidate.candidateId,
          header: candidate.header,
          slogan: candidate.slogan,
          voteCount: candidate.voteCount,
        });
      }
      console.log("Candidates:", candidates);

      // Admin account and verification
      const admin = await instance.methods.getAdmin().call();
      const isAdmin = accounts[0] === admin;
      console.log("Admin:", admin, "Current account:", accounts[0], "Is admin:", isAdmin);
      
      // Update state with all necessary data at once
      this.setState({ 
        web3, 
        ElectionInstance: instance, 
        account: accounts[0],
        candidateCount: candidateCount,
        isElStarted: start,
        isElEnded: end,
        electionDetails: electionDetails,
        candidates: candidates,
        isAdmin: isAdmin
      });
      console.log("State updated successfully");
    } catch (error) {
      // Catch any errors for any of the above operations.
      console.error("Error in componentDidMount:", error);
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      // Set error state to stop loading
      this.setState({ web3: null, error: error.message });
    }
  };
  
  // Load list of elections when no specific election is requested
  loadElectionList = async (web3, account) => {
    try {
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
        account: account,
        showElectionList: true,
      });

      // Get deployed elections from factory
      let deployedElections = await factoryInstance.methods.getDeployedElections().call();
      
      // Ensure deployedElections is an array
      if (!Array.isArray(deployedElections)) {
        deployedElections = [];
      }
      
      // Load details for each election
      const elections = [];
      for (let i = 0; i < deployedElections.length; i++) {
        const electionAddress = deployedElections[i];
        const electionContract = new web3.eth.Contract(Election.abi, electionAddress);
        
        // Get election details
        const electionDetails = await electionContract.methods.getElectionDetails().call();
        
        // Handle case where election details might be empty
        if (!electionDetails.electionTitle) {
          continue; // Skip this election if it doesn't have valid details
        }
        
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
        
        // Include elections that have been started or ended (but not inactive)
        if (start || end) {
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
      
      this.setState({ elections: elections });
      
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
      console.error("Error loading election list:", error);
      alert("Failed to load election list. Check console for details.");
    }
  };

  render() {
    const hideNavbar = this.props.hideNavbar || false;
    
    // If we're showing the election list (no specific election requested)
    if (this.state.showElectionList) {
      return (
        <>
          {this.state.isAdmin ? <NavbarAdmin /> : <Navbar />}
          <div className="container-main">
            <div className="container-item info">
              <h2 style={{textAlign: 'center', marginBottom: '2rem'}}>
                <i className="fas fa-vote-yea"></i> Select Election to View Results
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
                      
                      <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                        <Link 
                          to={`/Results?address=${election.address}`} 
                          className="btn btn-primary"
                          style={{textDecoration: 'none'}}
                        >
                          View Results
                        </Link>
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
    
    // Original rendering logic for specific election
    if (!this.state.web3) {
      const isUserPage = this.props.location ? this.props.location.pathname.startsWith('/user') : window.location.pathname.startsWith('/user');
      return (
        <>
          {!hideNavbar && (this.state.isAdmin && !isUserPage ? <NavbarAdmin /> : <Navbar />)}
          <div className="container-main">
            <div className="container-item center-items" style={{textAlign: 'center', padding: '4rem 2rem'}}>
              <div className="loading" style={{width: '3rem', height: '3rem', marginBottom: '2rem'}}></div>
              <h2 style={{marginBottom: '1rem'}}>Loading Web3, accounts, and contract...</h2>
              {this.state.error && (
                <div style={{color: 'red', marginTop: '1rem'}}>
                  <p>Error: {this.state.error}</p>
                  <p>Please check the browser console for more details.</p>
                </div>
              )}
            </div>
          </div>
        </>
      );
    }

    const isUserPage = this.props.location ? this.props.location.pathname.startsWith('/user') : window.location.pathname.startsWith('/user');

    return (
      <>
        {!hideNavbar && (this.state.isAdmin && !isUserPage ? <NavbarAdmin /> : <Navbar />)}
        <br />
        <div>
          {!this.state.isElStarted && !this.state.isElEnded ? (
            <NotInit />
          ) : this.state.isElStarted && !this.state.isElEnded ? (
            <div className="container-item attention">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                <div>
                  <h2 style={{margin: '0 0 0.5rem 0', color: 'var(--attention-text)'}}>
                    {this.state.electionDetails.electionTitle}
                  </h2>
                  <p style={{margin: 0, color: 'var(--attention-text)'}}>
                    {this.state.electionDetails.organizationTitle}
                  </p>
                </div>
                <div>
                  <p style={{margin: 0, color: 'var(--attention-text)', textAlign: 'right'}}>
                    <strong>Administrator:</strong> {this.state.electionDetails.adminName}
                  </p>
                  <p style={{margin: 0, color: 'var(--attention-text)', textAlign: 'right'}}>
                    {this.state.electionDetails.adminTitle}
                  </p>
                </div>
              </div>
              <div style={{textAlign: 'center'}}>
                <i className="fas fa-clock" style={{fontSize: '2rem', color: 'var(--attention-text)', marginBottom: '1rem'}}></i>
                <h3 style={{color: 'var(--attention-text)', marginBottom: '1rem'}}>Election in Progress</h3>
                <p style={{color: 'var(--attention-text)', marginBottom: '1rem'}}>Results will be displayed once the election has ended.</p>
                <p style={{color: 'var(--attention-text)', marginBottom: '1.5rem'}}>Go ahead and cast your vote (if not already).</p>
                <Link
                  to={`/voting/${this.props.match.params.address || window.location.search.split('address=')[1] || ''}`}
                  className="btn btn-primary"
                  style={{textDecoration: 'none'}}
                >
                  <i className="fas fa-vote-yea"></i>
                  Go to Voting Page
                </Link>
              </div>
            </div>
          ) : this.state.isElEnded ? (
            this.state.candidates && this.state.candidates.length > 0 && this.state.electionDetails ? 
              displayResults(this.state.candidates, this.state.electionDetails) :
              <div className="container-item center-items">
                <h3>Missing election data</h3>
                <p>This election has ended but required data is missing.</p>
                <p>Candidates: {this.state.candidates ? this.state.candidates.length : 'None'}</p>
                <p>Election Details: {this.state.electionDetails ? 'Available' : 'Missing'}</p>
              </div>
          ) : (
            <div>Unknown election state</div>
          )}
        </div>
      </>
    );
  }
}

function displayWinner(candidates) {
  // Validate input
  if (!candidates || candidates.length === 0) {
    return <div>No candidates found</div>;
  }
  
  const getWinner = (candidates) => {
    // Returns an object having maxium vote count
    let maxVoteRecived = 0;
    let winnerCandidate = [];
    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i].voteCount > maxVoteRecived) {
        maxVoteRecived = candidates[i].voteCount;
        winnerCandidate = [candidates[i]];
      } else if (candidates[i].voteCount === maxVoteRecived) {
        winnerCandidate.push(candidates[i]);
      }
    }
    return winnerCandidate;
  };
  const renderWinner = (winner) => {
    // Try to get logo from localStorage
    const logoKey = `candidate_${winner.id}_logo`;
    const logoData = localStorage.getItem(logoKey);
    
    return (
      <div className="container-winner">
        <div className="winner-info">
          <p className="winner-tag">Winner!</p>
          <h2> 
            {winner.header || 'Winner'}
            {logoData && (
              <img 
                src={logoData} 
                alt="Candidate Logo" 
                style={{ 
                  maxWidth: '80px', 
                  maxHeight: '80px', 
                  marginLeft: '15px',
                  verticalAlign: 'middle'
                }}
              />
            )}
          </h2>
          <p className="winner-slogan">{winner.slogan || 'Slogan'}</p>
        </div>
        <div className="winner-votes">
          <div className="votes-tag">Total Votes: </div>
          <div className="vote-count">{winner.voteCount || 0}</div>
        </div>
      </div>
    );
  };
  const winnerCandidate = getWinner(candidates);
  return <>{winnerCandidate.map(renderWinner)}</>;
}

function displayResults(candidates, electionDetails) {
  // Validate inputs
  if (!candidates || !electionDetails) {
    return <div>Error: Missing election data</div>;
  }
  
  // Sort candidates in decreasing order of vote count
  const sortedCandidates = [...candidates].sort((a, b) => b.voteCount - a.voteCount);
  
  return (
    <>
      <div className="container-item info">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
          <div>
            <h2 style={{margin: '0 0 0.5rem 0', color: 'var(--info-text)'}}>
              {electionDetails.electionTitle || 'Election Results'}
            </h2>
            <p style={{margin: 0, color: 'var(--info-text)'}}>
              {electionDetails.organizationTitle || 'Organization'}
            </p>
          </div>
          <div>
            <p style={{margin: 0, color: 'var(--info-text)', textAlign: 'right'}}>
              <strong>Administrator:</strong> {electionDetails.adminName || 'Admin'}
            </p>
            <p style={{margin: 0, color: 'var(--info-text)', textAlign: 'right'}}>
              {electionDetails.adminTitle || 'Title'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="container-main" style={{ borderTop: "1px solid" }}>
        <h2 className="result-header">Results</h2>
        <div className="container-item center-items">
          <div>{displayWinner(sortedCandidates)}</div>
        </div>
        
        {/* Candidates table-like display */}
        <div className="container-item">
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 'bold', borderBottom: '1px solid #ccc' }}>
            <div style={{ width: '10%' }}>Rank</div>
            <div style={{ width: '60%' }}>Candidate</div>
            <div style={{ width: '30%', textAlign: 'right' }}>Votes</div>
          </div>
          
          {sortedCandidates.map((candidate, index) => {
            // Try to get logo from localStorage
            const logoKey = `candidate_${candidate.id}_logo`;
            const logoData = localStorage.getItem(logoKey);
            
            return (
              <div key={candidate.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #eee' }}>
                <div style={{ width: '10%', display: 'flex', alignItems: 'center' }}>
                  #{index + 1}
                </div>
                <div style={{ width: '60%', display: 'flex', alignItems: 'center' }}>
                  <div>
                    {candidate.header || `Candidate ${index + 1}`}
                    {candidate.slogan && candidate.slogan.trim() !== "" && (
                      <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                        {candidate.slogan}
                      </div>
                    )}
                  </div>
                  {logoData && (
                    <img 
                      src={logoData} 
                      alt="Candidate Logo" 
                      style={{ 
                        maxWidth: '50px', 
                        maxHeight: '50px', 
                        marginLeft: '15px',
                        verticalAlign: 'middle'
                      }}
                    />
                  )}
                </div>
                <div style={{ width: '30%', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span style={{ 
                    backgroundColor: '#007bff', 
                    color: 'white', 
                    padding: '5px 10px', 
                    borderRadius: '15px',
                    fontWeight: 'bold'
                  }}>
                    {candidate.voteCount || 0} votes
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}