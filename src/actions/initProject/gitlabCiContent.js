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
        pdcsc apply -c "pdcsc-config-$\{CI_MERGE_REQUEST_TARGET_BRANCH_NAME\}.json" -dbm -dbl 2
      else
        pdcsc pipeline -c "pdcsc-config-$\{CI_MERGE_REQUEST_TARGET_BRANCH_NAME\}.json" -dbm -dbl 2
      fi
  rules:
    - when: manual`;
}

export default gitlabCiContent;
