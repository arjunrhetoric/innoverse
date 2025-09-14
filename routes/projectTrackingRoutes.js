// routes/projectTrackingRoutes.js
import express from 'express';
import axios from 'axios';
import Proposal from "../models/Proposal.js";
import Problem from '../models/Problem.js';
import Milestone from '../models/Milestone.js';

const router = express.Router();

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(id)

  try {
    let progress = await getStudentProjectProgress(req.user._id);
    let milestones = await getStudentMilestones(req.user._id);


    if (req.user.role === "Startup") {
      const { githubUsername, accessToken, githubRepoName } = req.user;

      // console.log(githubUsername , githubRepoName)
      let proposalData = await Proposal.findOne({_id : id})
      let problemId = proposalData.problemId
      let problemData = await Problem.findOne({_id : problemId._id})
      // console.log("Proposal Data taken : " , proposalData)
      // console.log("Problem data id : " , problemId)
      // console.log("Problem data taken : " , problemData)      

      if (!githubRepoName) {
        return res.status(400).send("GitHub repository name not set for startup.");
      }

      const encodedRepoName = encodeURIComponent(problemData.githubRepoName);
      // const prResponse = await axios.get(`https://api.github.com/repos/${githubUsername}/${encodedRepoName}/pulls`,
      const prResponse = await axios.get(`https://api.github.com/repos/${githubUsername}/${encodedRepoName}/pulls`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json'
          }
        }
      );
      const pullRequests = prResponse.data;
      // console.log(pullRequests)
      return res.render('project-tracking-dashboard', { 
        user: req.user,
        role: req.user.role, 
        pullRequests, 
        progress: null, 
        milestones: [],
        problemData
      });

    }
    else{
        // For Student users
        // let proposalData = await Proposal.findOne({_id : id})
        // let problemId = proposalData.problemId
        // let problemData = await Problem.findOne({_id : problemId._id})
        // console.log("PROGRESS : " , progress)
        let proposalData = await Proposal.findOne({_id : id})
        let problemId = proposalData.problemId
        let problemData = await Problem.findOne({_id : problemId._id})

        // console.log(problemData.completed);
          // console.log(problemData.progress);
        // Checking for the certification Generation part 
        if(problemData.completed === true || problemData.progress == 100)
        {         
          // document.getElementById("addMilestoneBtn").attributes("disabled,  true")
          console.log("The certiicate form is called successfully")
        }

        

        // console.log(problemData)
        // console.log(milestones)
        let filteredMilestones = milestones.filter(milestone => milestone.repoName === problemData.githubRepoName && milestone.completed == true);
        let milestoneCount = filteredMilestones.length;
        progress = milestoneCount * 2
        // console.log("filteredMilestones : " , filteredMilestones);
        // console.log(milestoneCount);
        filteredMilestones = milestones.filter(milestone => milestone.repoName === problemData.githubRepoName);
        milestoneCount = filteredMilestones.length;
        milestones = filteredMilestones
        // console.log(progress);
        
        let instance = await Problem.findByIdAndUpdate(problemId , {progress : progress * 10}) 
        // console.log(instance);
        instance.save()    
        if(instance.progress >= 100){
          // console.log(problemId)
          let instance2 = await Problem.findByIdAndUpdate(problemId , {
            completed : true
          })
          instance2.save()
          console.log("instance2 : " , instance2);
        }

        res.render('project-tracking-dashboard', {  
          user: req.user, 
          role: req.user.role, 
          pullRequests: null, 
          progress, 
          milestones,
          problemData
        });

    }

  } catch (error) {
    console.error("Project Tracking Dashboard error:", error.message);
    res.status(500).send("Server Error");
  }
  
});

async function getStudentProjectProgress(studentId) {
  const proposal = await Proposal.findOne({ studentId, status: "Approved" }).populate("problemId");
  return proposal && proposal.problemId ? proposal.problemId.progress || 0 : 0;
}

async function getStudentMilestones(studentId) {
  const milestones = await Milestone.find()
  return milestones
}

export default router;
