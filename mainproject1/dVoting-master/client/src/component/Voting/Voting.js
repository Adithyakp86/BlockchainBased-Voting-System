// Node modules
import React, { Component } from "react";
import { Link } from "react-router-dom";

// Components
import Navbar from "../Navbar/Navigation";
import NavbarAdmin from "../Navbar/NavigationAdmin";
import NotInit from "../NotInit";

// CSS
import "./Voting.css";

// Contract
import getWeb3 from "../../getWeb3";
import Election from "../../contracts/Election.json";

// Create a wrapper component to access route parameters
class VotingWrapper extends Component {
  render() {
    return <Voting {...this.props} />;
  }
}

export default VotingWrapper;

class Voting extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ElectionInstance: undefined,
      account: null,
      web3: null,
      isAdmin: false,
      candidateCount: undefined,
      candidates: [],
      isElStarted: false,
      isElEnded: false,
      currentVoter: {
        address: undefined,
        name: null,
        phone: null,
        hasVoted: false,
        isVerified: false,
        isRegistered: false,
      },
      electionDetails: {}, // To store election details
    };
  }

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

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      
      let instance;
      // Check if we're accessing a specific election via route params or URL params
      const routeElectionAddress = this.props.match.params.address;
      const urlParams = new URLSearchParams(window.location.search);
      const urlElectionAddress = urlParams.get('address');
      const electionAddress = routeElectionAddress || urlElectionAddress;
      
      if (electionAddress) {
        // Use the specific election address
        instance = new web3.eth.Contract(Election.abi, electionAddress);
      } else {
        // Check if we're accessing a specific election via URL params (backward compatibility)
        const urlElectionAddress = urlParams.get('address');
        if (urlElectionAddress) {
          instance = new web3.eth.Contract(Election.abi, urlElectionAddress);
        } else {
          // Fallback to the default election contract for backward compatibility
          const deployedNetwork = Election.networks[networkId];
          instance = new web3.eth.Contract(
            Election.abi,
            deployedNetwork && deployedNetwork.address
          );
        }
      }

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({
        web3: web3,
        ElectionInstance: instance,
        account: accounts[0],
      });

      // Get total number of candidates
      const candidateCount = await this.state.ElectionInstance.methods
        .getTotalCandidate()
        .call();
      this.setState({ candidateCount: candidateCount });

      // Get start and end values
      const start = await this.state.ElectionInstance.methods.getStart().call();
      const end = await this.state.ElectionInstance.methods.getEnd().call();
      this.setState({ isElStarted: start, isElEnded: end });

      // Get election details
      const electionDetails = await this.state.ElectionInstance.methods.getElectionDetails().call();
      this.setState({ electionDetails });

      // Loading Candidates details
      for (let i = 1; i <= this.state.candidateCount; i++) {
        const candidate = await this.state.ElectionInstance.methods
          .candidateDetails(i - 1)
          .call();
        this.state.candidates.push({
          id: candidate.candidateId,
          header: candidate.header,
          slogan: candidate.slogan,
        });
      }
      this.setState({ candidates: this.state.candidates });

      // Loading current voter
      const voter = await this.state.ElectionInstance.methods
        .voterDetails(this.state.account)
        .call();
      this.setState({
        currentVoter: {
          address: voter.voterAddress,
          name: voter.name,
          phone: voter.phone,
          hasVoted: voter.hasVoted,
          isVerified: voter.isVerified,
          isRegistered: voter.isRegistered,
        },
      });

      // Admin account and verification
      const admin = await this.state.ElectionInstance.methods.getAdmin().call();
      if (this.state.account === admin) {
        this.setState({ isAdmin: true });
      }
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.error(error);
    }
  };

  renderCandidates = (candidate) => {
    // Try to get logo from localStorage
    const logoKey = `candidate_${candidate.id}_logo`;
    const logoData = localStorage.getItem(logoKey);
    
    const castVote = async (id) => {
      await this.state.ElectionInstance.methods
        .vote(id)
        .send({ from: this.state.account, gas: 1000000 });
      window.location.reload();
    };
    const confirmVote = (id, header) => {
      var r = window.confirm(
        "Vote for " + header + " with Id " + id + ".\nAre you sure?"
      );
      if (r === true) {
        castVote(id);
      }
    };
    return (
      <div className="container-item">
        <div className="candidate-info">
          <h2>
            {candidate.header} <small>#{candidate.id}</small>
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
          <p className="slogan">{candidate.slogan}</p>
        </div>
        <div className="vote-btn-container">
          <button
            onClick={() => confirmVote(candidate.id, candidate.header)}
            className="vote-bth"
            disabled={
              !this.state.currentVoter.isRegistered ||
              !this.state.currentVoter.isVerified ||
              this.state.currentVoter.hasVoted
            }
          >
            Vote
          </button>
        </div>
      </div>
    );
  };

  render() {
    const hideNavbar = this.props.hideNavbar || false;
    if (!this.state.web3) {
      const isUserPage = this.props.location ? this.props.location.pathname.startsWith('/user') : window.location.pathname.startsWith('/user');
      return (
        <>
          {!hideNavbar && (this.state.isAdmin && !isUserPage ? <NavbarAdmin /> : <Navbar />)}
          <div className="container-main">
            <div className="container-item center-items" style={{textAlign: 'center', padding: '4rem 2rem'}}>
              <div className="loading" style={{width: '3rem', height: '3rem', marginBottom: '2rem'}}></div>
              <h2 style={{marginBottom: '1rem'}}>Loading Web3, accounts, and contract...</h2>
            </div>
          </div>
        </>
      );
    }

    const isUserPage = this.props.location ? this.props.location.pathname.startsWith('/user') : window.location.pathname.startsWith('/user');

    return (
      <>
        {!hideNavbar && (this.state.isAdmin && !isUserPage ? <NavbarAdmin /> : <Navbar />)}
        <div>
          {/* Election Header */}
          {this.state.electionDetails.electionTitle && (
            <div className="container-item success">
              <div style={{textAlign: 'center'}}>
                <h1 style={{color: 'var(--success-text)', marginBottom: '0.5rem'}}>
                  {this.state.electionDetails.electionTitle}
                </h1>
                <p style={{color: 'var(--success-text)', fontSize: '1.2rem', marginBottom: '1rem'}}>
                  {this.state.electionDetails.organizationTitle}
                </p>
                <p style={{color: 'var(--success-text)', marginBottom: '0.5rem'}}>
                  <strong>Admin:</strong> {this.state.electionDetails.adminName}
                </p>
              </div>
            </div>
          )}
          
          {!this.state.isElStarted && !this.state.isElEnded ? (
            <NotInit />
          ) : this.state.isElStarted && !this.state.isElEnded ? (
            <>
              {this.state.currentVoter.isRegistered ? (
                this.state.currentVoter.isVerified ? (
                  this.state.currentVoter.hasVoted ? (
                    <div className="container-item success">
                      <div>
                        <strong>You've casted your vote.</strong>
                        <p />
                        <center>
                          <Link
                            to={`/results/${this.props.match.params.address || ''}`}
                            style={{
                              color: "black",
                              textDecoration: "underline",
                            }}
                          >
                            See Results
                          </Link>
                        </center>
                      </div>
                    </div>
                  ) : (
                    <div className="container-item info">
                      <center>Go ahead and cast your vote.</center>
                    </div>
                  )
                ) : (
                  <>
                    <div className="container-item attention">
                      <center>
                        <strong>Please wait for admin to verify you.</strong>
                        <p />
                        <p>Your registered details:</p>
                        <table style={{ margin: "auto" }}>
                          <tr>
                            <td>Name</td>
                            <td>{this.state.currentVoter.name}</td>
                          </tr>
                          <tr>
                            <td>Phone</td>
                            <td>{this.state.currentVoter.phone}</td>
                          </tr>
                          <tr>
                            <td>Account</td>
                            <td>{this.state.currentVoter.address}</td>
                          </tr>
                        </table>
                      </center>
                    </div>
                  </>
                )
              ) : (
                <>
                  <div className="container-item attention">
                    <center>
                      <strong>Please register yourself first to vote.</strong>
                      <p />
                      <Link
                        to="/Registration"
                        style={{ color: "black", textDecoration: "underline" }}
                      >
                        Registration Page
                      </Link>
                    </center>
                  </div>
                </>
              )}
              <div className="container-main">
                <h2>Candidates</h2>
                <small>Total candidates: {this.state.candidates.length}</small>
                {this.state.candidates.length < 1 ? (
                  <div className="container-item attention">
                    <center>Not one to vote for.</center>
                  </div>
                ) : (
                  <>
                    {this.state.candidates.map(this.renderCandidates)}
                    <div
                      className="container-item"
                      style={{ border: "1px solid black" }}
                    >
                      <center>That is all.</center>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : !this.state.isElStarted && this.state.isElEnded ? (
            <>
              <div className="container-item attention">
                <center>
                  <h3>The Election ended.</h3>
                  <br />
                  <Link
                    to="/Results"
                    style={{ color: "black", textDecoration: "underline" }}
                  >
                    See results
                  </Link>
                </center>
              </div>
            </>
          ) : null}
        </div>
      </>
    );
  }
}