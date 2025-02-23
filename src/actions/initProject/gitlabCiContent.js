function gitlabCiContent() {
    return `stages:
  - build

variables:
  GIT_DEPTH: 0

before_merge_build:
  stage: build
  image: node:alpine
  script:
    - echo "Installing dependencies..."
    - apk update && apk add git
    - npm i @puya/pdcsc -g
    - |
      if [ "$CI_MERGE_REQUEST_SOURCE_BRANCH_NAME" = "dev" ] || [ "$CI_MERGE_REQUEST_SOURCE_BRANCH_NAME" = "main" ]; then
        pdcsc -ud -dbm -c "pdcsc-config.$\{CI_MERGE_REQUEST_TARGET_BRANCH_NAME\}.json"
      else
        pdcsc -rop -dbm -c "pdcsc-config.$\{CI_MERGE_REQUEST_TARGET_BRANCH_NAME\}.json"
      fi
  rules:
    - when: manual`;
}

export default gitlabCiContent;
