function azuredevopsPipelineContent() {
  return `trigger:
  branches:
    include:
      - dev
      - main

variables:
  GIT_DEPTH: 0
  DB_PASS: $(SQLSERVER_DB_PASS)

stages:
  - stage: Build
    jobs:
      - job: BeforeMergeBuild
        displayName: "Before Merge Build"
        pool:
          vmImage: "ubuntu-latest"
        steps:
          - script: |
              echo "Installing dependencies..."
              sudo apt-get update && sudo apt-get install -y git
              npm install -g @puya/pdcsc
              if [[ "$(Build.SourceBranchName)" == "dev" || "$(Build.SourceBranchName)" == "main" ]]; then
                pdcsc apply -c "pdcsc-config-$(System.PullRequest.TargetBranchName).json" -dbm -f -p "$(DB_PASS)"
              else
                pdcsc pipeline -c "pdcsc-config-$(System.PullRequest.TargetBranchName).json" -dbm -p "$(DB_PASS)"
              fi
            displayName: "Run Build Script"
          condition: eq(variables['Build.Reason'], 'Manual')
`;
}

export default azuredevopsPipelineContent;
