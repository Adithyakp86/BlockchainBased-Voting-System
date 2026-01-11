// Node modules
import React, { Component } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

// Components
import Navbar from "./Navbar/Navigation";
import NavbarAdmin from "./Navbar/NavigationAdmin";
import UserHome from "./UserHome";
import StartEnd from "./StartEnd";
import ElectionStatus from "./ElectionStatus";

// Contract
import getWeb3 from "../getWeb3";
import Election from "../contracts/Election.json";
import ElectionFactory from "../contracts/ElectionFactory.json";

// CSS
import "./Home.css";

// const buttonRef = React.createRef();
export default class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ElectionInstance: undefined,
      ElectionFactoryInstance: undefined,
      account: null,
      web3: null,
      isAdmin: false,
      elStarted: false,
      elEnded: false,
      elDetails: {},
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

      // Get the ElectionFactory contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedFactoryNetwork = ElectionFactory.networks[networkId];
      const factoryInstance = new web3.eth.Contract(
        ElectionFactory.abi,
        deployedFactoryNetwork && deployedFactoryNetwork.address
      );

      // Get the Election contract instance (for backward compatibility).
      const deployedElectionNetwork = Election.networks[networkId];
      const electionInstance = new web3.eth.Contract(
        Election.abi,
        deployedElectionNetwork && deployedElectionNetwork.address
      );

      // Set web3, accounts, and contracts to the state
      this.setState({
        web3: web3,
        ElectionInstance: electionInstance,
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
      
      this.setState({ elections });

      // For backward compatibility, check the main election contract
      if (deployedElectionNetwork) {
        const admin = await electionInstance.methods.getAdmin().call();
        if (this.state.account === admin) {
          this.setState({ isAdmin: true });
        }

        // Get election start and end values
        const start = await electionInstance.methods.getStart().call();
        const end = await electionInstance.methods.getEnd().call();
        this.setState({ elStarted: start, elEnded: end });

        // Getting election details from the contract
        const electionDetails = await electionInstance.methods.getElectionDetails().call();
        
        this.setState({
          elDetails: {
            adminName: electionDetails.adminName,
            adminEmail: electionDetails.adminEmail,
            adminTitle: electionDetails.adminTitle,
            electionTitle: electionDetails.electionTitle,
            organizationTitle: electionDetails.organizationTitle,
          },
        });
      }
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.error(error);
    }
  };
  
  // Create a new election using the factory
  createElection = async (data) => {
    try {
      await this.state.ElectionFactoryInstance.methods
        .createElection(
          data.adminFName.toLowerCase() + " " + data.adminLName.toLowerCase(),
          data.adminEmail.toLowerCase(),
          data.adminTitle.toLowerCase(),
          data.electionTitle.toLowerCase(),
          data.organizationTitle.toLowerCase()
        )
        .send({ from: this.state.account, gas: 2000000 });
      
      // Reload the page to show the new election
      window.location.reload();
    } catch (error) {
      console.error("Error creating election:", error);
      alert("Failed to create election. Check console for details.");
    }
  };

  // end election (for backward compatibility)
  endElection = async () => {
    await this.state.ElectionInstance.methods
      .endElection()
      .send({ from: this.state.account, gas: 1000000 });
    window.location.reload();
  };
  
  // register and start election (for backward compatibility)
  registerElection = async (data) => {
    await this.state.ElectionInstance.methods
      .setElectionDetails(
        data.adminFName.toLowerCase() + " " + data.adminLName.toLowerCase(),
        data.adminEmail.toLowerCase(),
        data.adminTitle.toLowerCase(),
        data.electionTitle.toLowerCase(),
        data.organizationTitle.toLowerCase()
      )
      .send({ from: this.state.account, gas: 1000000 });
    window.location.reload();
  };

  // Start all elections
  startAllElections = async () => {
    try {
      // Start all elections created through the factory
      const deployedElections = await this.state.ElectionFactoryInstance.methods.getDeployedElections().call();
      
      let startedCount = 0;
      let alreadyStartedCount = 0;
      
      for (let i = 0; i < deployedElections.length; i++) {
        const electionAddress = deployedElections[i];
        const electionContract = new this.state.web3.eth.Contract(Election.abi, electionAddress);
        
        // Get current election details
        const electionDetails = await electionContract.methods.getElectionDetails().call();
        
        // If the election hasn't been started yet, start it
        const start = await electionContract.methods.getStart().call();
        if (!start) {
          // Check if election details exist, if not, we need to set default details
          if (!electionDetails.electionTitle || electionDetails.electionTitle === "") {
            // Set default election details if none exist
            await electionContract.methods
              .setElectionDetails(
                "Admin", // Default admin name
                "admin@example.com", // Default admin email
                "Election Admin", // Default admin title
                "Election " + (i + 1), // Default election title
                "Organization" // Default organization title
              )
              .send({ from: this.state.account, gas: 1000000 });
          } else {
            // Use existing election details
            await electionContract.methods
              .setElectionDetails(
                electionDetails.adminName,
                electionDetails.adminEmail,
                electionDetails.adminTitle,
                electionDetails.electionTitle,
                electionDetails.organizationTitle
              )
              .send({ from: this.state.account, gas: 1000000 });
          }
          startedCount++;
        } else {
          alreadyStartedCount++;
        }
      }
      
      alert(`Successfully processed elections: ${startedCount} started, ${alreadyStartedCount} already started.`);
      window.location.reload();
    } catch (error) {
      console.error("Error starting all elections:", error);
      alert("Failed to start all elections. Check console for details.");
    }
  };

  // End all elections
  endAllElections = async () => {
    try {
      // End all elections created through the factory
      const deployedElections = await this.state.ElectionFactoryInstance.methods.getDeployedElections().call();
      
      let endedCount = 0;
      let alreadyEndedCount = 0;
      
      for (let i = 0; i < deployedElections.length; i++) {
        const electionAddress = deployedElections[i];
        const electionContract = new this.state.web3.eth.Contract(Election.abi, electionAddress);
        
        // Get current election status
        const start = await electionContract.methods.getStart().call();
        const end = await electionContract.methods.getEnd().call();
        
        // If the election is started but not ended, end it
        if (start && !end) {
          await electionContract.methods
            .endElection()
            .send({ from: this.state.account, gas: 1000000 });
          endedCount++;
        } else if (end) {
          alreadyEndedCount++;
        }
      }
      
      alert(`Successfully processed elections: ${endedCount} ended, ${alreadyEndedCount} already ended.`);
      window.location.reload();
    } catch (error) {
      console.error("Error ending all elections:", error);
      alert("Failed to end all elections. Check console for details.");
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
          <Navbar />
          <div className="container-main">
            <div className="container-item center-items" style={{textAlign: 'center', padding: '4rem 2rem'}}>
              <div className="loading" style={{width: '3rem', height: '3rem', marginBottom: '2rem'}}></div>
              <h2 style={{marginBottom: '1rem'}}>Connecting to Blockchain</h2>
              <p style={{color: 'var(--text-secondary)'}}>
                Loading Web3, accounts, and smart contracts...
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
          {/* Display multiple elections */}
          {this.state.elections.length > 0 && (
            <div className="container-item info">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                <h3 style={{color: 'var(--info-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <i className="fas fa-vote-yea"></i>
                  Available Elections
                </h3>
                {this.state.isAdmin && (
                  <button 
                    className="btn btn-primary"
                    onClick={this.startAllElections}
                    style={{padding: '0.5rem 1rem'}}
                  >
                    Start All Elections
                  </button>
                )}
              </div>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem'}}>
                {this.state.elections.map((election, index) => (
                  <div key={index} className="container-item" style={{border: '1px solid var(--info-text)'}}>
                    <h4 style={{color: 'var(--info-text)', marginBottom: '1rem'}}>
                      {election.details.electionTitle}
                    </h4>
                    <p style={{color: 'var(--info-text)', marginBottom: '0.5rem'}}>
                      <strong>Organization:</strong> {election.details.organizationTitle}
                    </p>
                    <p style={{color: 'var(--info-text)', marginBottom: '0.5rem'}}>
                      <strong>Admin:</strong> {election.details.adminName}
                    </p>
                    <p style={{color: 'var(--info-text)', marginBottom: '1rem'}}>
                      <strong>Status:</strong> 
                      {!election.started && !election.ended && " Not Started"}
                      {election.started && !election.ended && " Active"}
                      {election.started && election.ended && " Ended"}
                    </p>
                    {/* Display candidates for this election */}
                    {election.candidates && election.candidates.length > 0 && (
                      <div style={{marginBottom: '1rem'}}>
                        <h4 style={{color: 'var(--info-text)', margin: '0.5rem 0'}}>Candidates:</h4>
                        <ul style={{paddingLeft: '1.5rem', margin: '0.5rem 0', color: 'var(--info-text)'}}>
                          {election.candidates.map((candidate, idx) => (
                            <li key={idx} style={{margin: '0.25rem 0'}}>
                              {candidate.header}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap'}}>
                      <Link 
                        to={`/voting/${election.address}`} 
                        className="btn btn-primary"
                        style={{textDecoration: 'none'}}
                      >
                        View Election
                      </Link>
                      {this.state.isAdmin && (
                        <>
                          <Link 
                            to={`/addcandidate/${election.address}`} 
                            className="btn btn-success"
                            style={{textDecoration: 'none'}}
                          >
                            Add Candidates
                          </Link>
                          {election.started && !election.ended && (
                            <button 
                              className="btn btn-danger"
                              onClick={() => this.endElectionByAddress(election.address)}
                              style={{textDecoration: 'none', border: 'none', cursor: 'pointer'}}
                            >
                              End Election
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Election Rules Section */}
          <div className="container-item info">
            <h3 style={{color: 'var(--info-text)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <i className="fas fa-gavel"></i>
              Election Rules & Guidelines
            </h3>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem'}}>
              <div>
                <h4 style={{color: 'var(--info-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <i className="fas fa-user-check"></i>
                  Voter Registration
                </h4>
                <ul style={{color: 'var(--info-text)', paddingLeft: '1.5rem', lineHeight: '1.6'}}>
                  <li>Each voter must register with valid name and phone number</li>
                  <li>Only one registration per blockchain address</li>
                  <li>Admin must verify each registration before voting</li>
                  <li>Registration is required before the election starts</li>
                </ul>
              </div>
              <div>
                <h4 style={{color: 'var(--info-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <i className="fas fa-vote-yea"></i>
                  Voting Process
                </h4>
                <ul style={{color: 'var(--info-text)', paddingLeft: '1.5rem', lineHeight: '1.6'}}>
                  <li>One vote per verified voter</li>
                  <li>Votes are recorded on the blockchain</li>
                  <li>Voting is anonymous and secure</li>
                  <li>Cannot change vote once submitted</li>
                </ul>
              </div>
              <div>
                <h4 style={{color: 'var(--info-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <i className="fas fa-shield-alt"></i>
                  Security & Transparency
                </h4>
                <ul style={{color: 'var(--info-text)', paddingLeft: '1.5rem', lineHeight: '1.6'}}>
                  <li>All transactions are recorded on blockchain</li>
                  <li>Results are tamper-proof and verifiable</li>
                  <li>Admin cannot manipulate votes</li>
                  <li>Full transparency in the voting process</li>
                </ul>
              </div>
              <div>
                <h4 style={{color: 'var(--info-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <i className="fas fa-clock"></i>
                  Election Timeline
                </h4>
                <ul style={{color: 'var(--info-text)', paddingLeft: '1.5rem', lineHeight: '1.6'}}>
                  <li>Registration period: Before election starts</li>
                  <li>Voting period: After admin starts election</li>
                  <li>Results: Available after election ends</li>
                  <li>No voting after election is closed</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="container-item center-items info">
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap'}}>
              <i className="fas fa-wallet" style={{color: 'var(--primary)', fontSize: '1.5rem'}}></i>
              <div>
                <h4 style={{margin: '0 0 0.5rem 0', color: 'var(--info-text)'}}>Connected Account</h4>
                <code style={{fontSize: '0.875rem', wordBreak: 'break-all'}}>{this.state.account}</code>
              </div>
            </div>
          </div>
          {!this.state.elStarted & !this.state.elEnded ? (
            <div className="container-item attention">
              <div style={{textAlign: 'center'}}>
                <i className="fas fa-clock" style={{fontSize: '2rem', color: 'var(--attention-text)', marginBottom: '1rem'}}></i>
                <h3 style={{color: 'var(--attention-text)', marginBottom: '1rem'}}>Election Not Initialized</h3>
                {this.state.isAdmin ? (
                  <p style={{color: 'var(--attention-text)'}}>Please set up the election details below to begin.</p>
                ) : (
                  <p style={{color: 'var(--attention-text)'}}>Please wait for the admin to initialize the election.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
        {this.state.isAdmin ? (
          <>
            <this.renderAdminHome />
          </>
        ) : this.state.elStarted ? (
          <>
            <UserHome el={this.state.elDetails} hideNavbar={true} />
          </>
        ) : !this.state.elStarted && this.state.elEnded ? (
          <>
            <div className="container-item success">
              <div style={{textAlign: 'center'}}>
                <i className="fas fa-check-circle" style={{fontSize: '2rem', color: 'var(--success-text)', marginBottom: '1rem'}}></i>
                <h3 style={{color: 'var(--success-text)', marginBottom: '1rem'}}>Election Completed</h3>
                <p style={{color: 'var(--success-text)', marginBottom: '1.5rem'}}>The voting period has ended. View the final results below.</p>
                <Link
                  to="/Results"
                  className="btn btn-success"
                  style={{textDecoration: 'none'}}
                >
                  <i className="fas fa-chart-bar"></i>
                  View Results
                </Link>
              </div>
            </div>
          </>
        ) : !this.state.elStarted && !this.state.elEnded ? (
          // Show direct access options for users when election is not started
          <>
            <div className="container-item info">
              <div style={{textAlign: 'center'}}>
                <h3 style={{color: 'var(--info-text)', marginBottom: '1rem'}}>Election Not Yet Started</h3>
                <p style={{color: 'var(--info-text)', marginBottom: '1.5rem'}}>Please wait for the administrator to start the election.</p>
                <p style={{color: 'var(--info-text)', marginBottom: '1.5rem'}}>You can register or access voting features directly:</p>
                <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap'}}>
                  <Link
                    to="/Registration"
                    className="btn btn-primary"
                    style={{textDecoration: 'none'}}
                  >
                    <i className="fas fa-user-plus"></i>
                    Register to Vote
                  </Link>
                  <Link
                    to="/Voting"
                    className="btn btn-success"
                    style={{textDecoration: 'none'}}
                  >
                    <i className="fas fa-vote-yea"></i>
                    Access Voting
                  </Link>
                  <Link
                    to="/user"
                    className="btn btn-info"
                    style={{textDecoration: 'none'}}
                  >
                    <i className="fas fa-users"></i>
                    User Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </>
    );
  }

  renderAdminHome = () => {
    const EMsg = (props) => {
      return <span style={{ color: "tomato" }}>{props.msg}</span>;
    };

    const AdminHome = () => {
      // Contains of Home page for the Admin
      const {
        handleSubmit,
        register,
        formState: { errors },
      } = useForm();

      const onSubmit = (data) => {
        this.createElection(data); // Use the new createElection method
      };

      return (
        <div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="container-main">
              {/* about-admin */}
              <div className="about-admin">
                <h3><i className="fas fa-user-shield"></i> Create New Election</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="label-home">
                      Full Name{" "}
                      {errors.adminFName && <span className="error-message">*required</span>}
                    </label>
                    <div className="form-row">
                      <input
                        className="input-home"
                        type="text"
                        placeholder="First Name"
                        {...register("adminFName", {
                          required: "First name is required",
                          pattern: {
                            value: /^[A-Za-z\s]+$/,
                            message: "Name should contain only letters and spaces"
                          },
                          minLength: {
                            value: 3,
                            message: "Name should contain at least 3 characters"
                          }
                        })}
                      />
                      <input
                        className="input-home"
                        type="text"
                        placeholder="Last Name"
                        {...register("adminLName", {
                          pattern: {
                            value: /^[A-Za-z\s]+$/,
                            message: "Name should contain only letters and spaces"
                          },
                          minLength: {
                            value: 2,
                            message: "Name should contain at least 2 characters"
                          }
                        })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="label-home">
                      Email Address{" "}
                      {errors.adminEmail && (
                        <span className="error-message">{errors.adminEmail.message}</span>
                      )}
                    </label>
                    <input
                      className="input-home"
                      placeholder="eg. you@example.com"
                      name="adminEmail"
                      {...register("adminEmail", {
                        required: "Email is required",
                        pattern: {
                          value: /^[A-Za-z0-9._%+-]+@gmail\.com$/i,
                          message: "Please enter a valid Gmail address",
                        },
                      })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="label-home">
                      Job Title or Position{" "}
                      {errors.adminTitle && <span className="error-message">*required</span>}
                    </label>
                    <input
                      className="input-home"
                      type="text"
                      placeholder="eg. HR Head, Election Commissioner"
                      {...register("adminTitle", {
                        required: true,
                      })}
                    />
                  </div>
                </div>
              </div>
              {/* about-election */}
              <div className="about-election">
                <h3><i className="fas fa-vote-yea"></i> About Election</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="label-home">
                      Election Title{" "}
                      {errors.electionTitle && <span className="error-message">*required</span>}
                    </label>
                    <input
                      className="input-home"
                      type="text"
                      placeholder="eg. Student Council Election, Board Election"
                      {...register("electionTitle", {
                        required: true,
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label-home">
                      Organization Name{" "}
                      {errors.organizationTitle && <span className="error-message">*required</span>}
                    </label>
                    <input
                      className="input-home"
                      type="text"
                      placeholder="eg. Lifeline Academy, Tech University"
                      {...register("organizationTitle", {
                        required: true,
                      })}
                    />
                  </div>
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="container-item center-items">
                <button type="submit" className="btn btn-primary" style={{padding: '1rem 2rem', fontSize: '1rem'}}>
                  <i className="fas fa-rocket"></i>
                  Create Election
                </button>
              </div>
            </div>
            
            {/* Start All Elections Button - only show if there are multiple elections */}
            {this.state.elections && this.state.elections.length > 0 && (
              <div className="container-item center-items">
                <button 
                  type="button" 
                  className="btn btn-success" 
                  style={{padding: '1rem 2rem', fontSize: '1rem', marginTop: '1rem'}}
                  onClick={this.startAllElections}
                >
                  <i className="fas fa-play-circle"></i>
                  Start All Elections
                </button>
                <p style={{marginTop: '0.5rem', color: 'var(--text-secondary)'}}>
                  Start all {this.state.elections.length} created elections at once
                </p>
              </div>
            )}
            
            {/* End All Elections Button - only show if there are active elections */}
            {this.state.elections && this.state.elections.some(election => election.started && !election.ended) && (
              <div className="container-item center-items">
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  style={{padding: '1rem 2rem', fontSize: '1rem', marginTop: '1rem'}}
                  onClick={this.endAllElections}
                >
                  <i className="fas fa-stop-circle"></i>
                  End All Active Elections
                </button>
                <p style={{marginTop: '0.5rem', color: 'var(--text-secondary)'}}>
                  End all active elections at once
                </p>
              </div>
            )}
            <StartEnd
              elStarted={this.state.elStarted}
              elEnded={this.state.elEnded}
              endElFn={this.endElection}
              startAllFn={this.startAllElections}
              endAllFn={this.endAllElections}
            />
            <ElectionStatus
              elStarted={this.state.elStarted}
              elEnded={this.state.elEnded}
            />
          </form>
        </div>
      );
    };
    return <AdminHome />;
  };
}