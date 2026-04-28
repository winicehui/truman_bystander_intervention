# Qualtrics Integration (Current)

- Redirect:
  `http://localhost:3000/?ResponseID=${e://Field/ResponseID}&Condition=${e://Field/Condition}`

- Backend:
  Reads the participant identifier via:
  `req.query.ResponseID || req.query.r_id`

- Condition:
  Reads condition via:
  `req.query.Condition || req.query.condition`

- Account creation:
  Saves `ResponseID` to `user.ResponseID`
  Saves `Condition` to `user.experimentalCondition`

- Current condition behavior:
  `C1`
  User goes from community guidelines to `training_intro`, then `training_module`
  Chatbot is enabled in `training_module`
  Chatbot is disabled in the main feed

  `C2`
  User goes from community guidelines directly to the main feed
  Chatbot is enabled in the main feed
  No training module

  `C3`
  User goes from community guidelines directly to the main feed
  Chatbot is disabled
  No training module

- Training module:
  Training post & replies is currently identified by `condition = C1`
  Main feed excludes that training post
  Training progress currently requires:
  if chatbot is enabled, either 5+ user turns in chat or one public comment
  if chatbot is disabled, one public comment


- Chatbot context:
  Chatbot now receives both:
  `postContext`
  `commentContext` (existing comments on the post)

- Final comment behavior:
  When chatbot returns:
  `FINAL_COMMENT: ...`
  the text is pasted into the comment box, but is not auto-posted

- Profile icon:
  Signup-selected stock profile icons now carry through to training and main feed views

- Qualtrics testing URL:
  Main Survey (automatic randomization): 
  Surveys links to test different conditions:
    - C1 (Prior training): https://cornell.ca1.qualtrics.com/jfe/form/SV_6gQ7nE6TjUftTyS
    - C2 (In-situ training): https://cornell.ca1.qualtrics.com/jfe/form/SV_3Visfacf1xQqbKS
    - C3 (baseline): https://cornell.ca1.qualtrics.com/jfe/form/SV_3EPPFhJauK6AddY


- Notes:
  Current preferred Qualtrics parameters are `ResponseID` and `Condition`
  Lowercase `condition` and `r_id` are still accepted for compatibility
