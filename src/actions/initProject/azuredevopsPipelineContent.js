function azuredevopsPipelineContent() {
  return `trigger:
- none

variables:
  GIT_DEPTH: 0

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
          pdcsc apply -c "pdcsc-config-$(Build.SourceBranchName).json -dbm"
        else
          pdcsc pipeline -c "pdcsc-config-$(Build.SourceBranchName).json -dbm"
      displayName: "Run build scripts"
    condition: eq(variables['Build.Reason'], 'Manual')
`;
}

export default azuredevopsPipelineContent;
