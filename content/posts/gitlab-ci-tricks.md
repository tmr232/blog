---
title: GitLab CI Tricks
published: true
description: A collection of useful hacks for the GitLab CI
# tags: devops, git, gitlab, cicd
//cover_image: https://direct_url_to_image.jpg
canonical_url: https://www.vdoo.com/blog/gitlab-ci-tricks
date: 2021-03-10
---

In writing our CI setup at Vdoo, we came across some interesting challenges. Having solved them and used the solutions for quite a while, we decided it is best to share, and hopefully save others some time and effort solving similar problems.

Of course, there are alternative solutions to the challenges we have dealt with, and some solutions are probably superior to ours. We are happy to hear about such solutions and to improve our own.

As for the code presented in this post - it was extracted from our CI and cleaned up a bit. As such, it is missing some necessary boilerplate. It will not work as-is, and some work will be required to adapt it to your CI. That said, it should clearly lay out the solutions. (You can think of it as slide-ware.)

## LFS-Check

All transitions can be bumpy. For us, the transition from storing binary files as regular git blobs to storing them using LFS was one such bumpy transition.

We made sure to include all the LFS-relevant files & patterns in a .gitattributes file, but ensuring everyone (including people who only occasionally work on the relevant repo) properly setup their environments for LFS took some time. In the mean-time, we kept getting files that should be in LFS committed and pushed as regular files in Merge-Requests.

To circumvent that, we set up a simple check at the start of our CI process to ensure all relevant files are indeed stored in LFS.

```yaml
lfs-check:
  only:
    refs:
      - merge_requests
  script:
    - git lfs install
    - git add --renormalize -u
    - |
      if ! git diff --cached --name-only --exit-code ; then
        echo
        echo
        echo "=============================="
        echo "#  Please renormalize files  #"
        echo "=============================="
        echo
        echo "git add -u --renormalize"
        echo "git commit --amend"
        exit 1
      fi

```

When people pushed the files the wrong way - the CI would fail with an informative error and instructions.

## Required Commit

Every so often a change is made to the code, rendering the code before the change unworkable or irrelevant. This can happen for many reasons. Here are some examples:

1. A bug was fixed in the CI. This is all too common when forgetting to properly lock your dependencies (including recursive ones!)
2. A very time-consuming update was made (re-training an ML model, anyone?)
3. The change is significant and will make rebasing a pain
4. A significant bug was fixed, making tests on the previous versions mostly irrelevant

Once you introduce such a change to your code, you want people to know about it, and you want to stop wasting cycles on it.

To achieve this goal, we created a required-commit mechanism in our CI. For the CI to work, the required-commit must be an ancestor of the current commit. If it isn't - the CI fails with a descriptive error & instructions for fixing the issue.

Once we have a new required-commit, we inform all developers in a dedicated Slack channel and update the CI to match. This ensures that even if a developer misses the notification on Slack, the CI will let them know what needs to be done.

The solution consists of a simple CI job:

```yaml
required-commit:
  only:
    refs:
      - merge_requests
  script:
    - apt-get update
    - |
      if ! git merge-base --is-ancestor ${REQUIRED_COMMIT:-HEAD} HEAD ; then
        echo
        echo
        echo "============================="
        echo "#      Rebase Required      #"
        echo "============================="
        echo
        echo "Your base commit is out of date."
        echo "Please update to ${REQUIRED_COMMIT} or later."
        echo "The easiest fix is to rebase-onto or merge-from origin/main."
        echo
        echo
        exit 1
      fi

```

And a custom variable defined in the CI settings (see [Create a custom variable in the UI](https://docs.gitlab.com/ee/ci/variables/#create-a-custom-variable-in-the-ui)):

![alt text](/images/gitlab-ci-tricks.png)
 

## Conditionally Building Job Docker Images

Some of our code is deployed via Docker images. As such - we want our CI to build and test those images. Some tests require running a Docker container and communicating with it, but some tests (especially unit- and integration-tests) are easier to run inside the said containers. To accommodate the latter, we use our Docker images as the base images for the CI test jobs.

This is easy enough to do in the CI. In our case, however, building the Docker images takes a very long time. In trying to reduce this time, we split our build into two parts. The first - a long compilation phase, building some rarely-changing code; the second - installation of our fast-changing Python code & all relevant dependencies.

Noticing the split between the fast-changing and rarely-changing parts of our build, we decided to split it in half, only building the first part when there's an actual change to it.

To do that, however, we have to conditionally build the Docker image for the first half, and in the second half use either the preexisting first half or the newly built one.

### The Solution - Build, Proxy, Promote

Our solution uses a model consisting of multiple CI jobs handling different parts.

1. **Build** jobs - responsible for building docker images. Either conditionally (for the first part) or consistently (for the second part).
2. **Proxy** jobs - responsible for handling the conditional nature of the build jobs, providing the next job with the relevant tag for the Docker images - either `:latest` or the current commit.
3. **Promote** jobs - responsible for tagging the newly built images with `:latest` and pushing them. They run last.

For our use-case, we used the following setup:

1. Conditional **Build** job to build the rarely-changing code
2. **Proxy** job to yield the relevant tags
3. **Build** job to build & install the fast-changing code
4. **Test** job, to test the newly build code
5. **Promote** job, pushing the newly build images as `:latest` if the tests passed

To implement it, we created the following `.yml` configuration, representing the build-proxy-promote model, and used [`include:file`](https://docs.gitlab.com/ee/ci/yaml/#includefile) to bring it into our `.gitlab-ci.yml`.

```yaml
# This file allows creating a prebuild-proxy-(build)-promote workflow with ease.  
#  
# The idea is that that in the prebuild step we build less-frequently-changed  
# docker images than in the build step. This allows us to significantly speed  
# up CI times.  
#  
# Setting Up  
# ==========  
#  
# A basic setup consists of the following:  
#  
# 1\. Prebuild (extends .bpp:build)  - build docker images if relevant files changed  
# 2\. Proxy (extends .bpp:proxy) - allows the rest of the CI to know whether Prebuild created new images or not  
# 3\. Build [Optional] (extends .bpp:build) - builds extra, more-frequently-changing images.  
#                                             This is not a conditional step!  
# 4\. Use (custom step) - here we actually use the images we created!  
# 5\. Promote (extends .bpp:promote) - if required, pushes the newly built images to the project's repository.  
#  
# These 5 steps should be in 5 different, consecutive stages for things to work.  
# The prebuild step, being conditional, should not have any other step requiring it.  
# All other steps (that need the prebuilt images) should require the proxy step instead,  
# and use the ${PROXY_TAG} to as a label to the relevant docker images.


.bpp:build:
  variables:
    # The names of all the docker images we want to pull from our registry
    TO_PULL: ""
    # The tag to use for pulling the images. This will usually be ${PROXY_TAG}
    PULL_TAG: ""
    # The name of the image and path of the dockerfile for building docker images.
    # The root path for the dockers will be the root of the project
    # Format the variable as follows:
    #
    #     >-
    #       "some_name the/relevant/path/Dockerfile"
    #       "some_other_name another/relevant/path/Dockerfile"
    #
    # Note that the quotes are significant!
    TO_BUILD: ""
    # The names of the images we want to push.
    # They will all be pushed with the ${CI_COMMIT_SHA} tag.
    TO_PUSH: ""
  script:
    - docker login -u ${CI_REGISTRY_USER} -p ${CI_REGISTRY_PASSWORD} ${CI_REGISTRY_IMAGE}
    - export DOCKER_BUILDKIT=1 # This cannot be in the `variables` field since users overwrite it.
    - |
      for IMAGE_NAME in ${TO_PULL}
      do
          echo "***********************************"
          echo "Pulling ${IMAGE_NAME}"
          echo "-----------------------------------"
          echo "docker pull ${CI_REGISTRY_IMAGE}/${IMAGE_NAME}:${PULL_TAG}"
          echo "DOCKER_BUILDKIT=1 docker tag \
                ${CI_REGISTRY_IMAGE}/${IMAGE_NAME}:${PULL_TAG} \
                ${CI_REGISTRY_IMAGE}/${IMAGE_NAME}:latest"
          echo "***********************************"
          docker pull ${CI_REGISTRY_IMAGE}/${IMAGE_NAME}:${PULL_TAG}
          docker tag \
              ${CI_REGISTRY_IMAGE}/${IMAGE_NAME}:${PULL_TAG} \
              ${CI_REGISTRY_IMAGE}/${IMAGE_NAME}:latest
      done
    - |
      eval "ARRAY=($TO_BUILD)"
      for ITEM in "${ARRAY[@]}"
      do
          MY_NAME=${ITEM% *}
          MY_PATH=${ITEM#* }
          echo "***********************************"
          echo "Building ${MY_NAME} from ${MY_PATH}"
          echo "-----------------------------------"
          echo "DOCKER_BUILDKIT=1 docker build \
              --build-arg BUILDKIT_INLINE_CACHE=1 \
              -t ${CI_REGISTRY_IMAGE}/${MY_NAME} \
              -t ${CI_REGISTRY_IMAGE}/${MY_NAME}:${CI_COMMIT_SHA} \
              -f ${MY_PATH} \
              --label "commit_sha=${CI_COMMIT_SHA}" \
              ."
          echo "***********************************"
          docker build \
              --build-arg BUILDKIT_INLINE_CACHE=1 \
              -t ${CI_REGISTRY_IMAGE}/${MY_NAME} \
              -t ${CI_REGISTRY_IMAGE}/${MY_NAME}:${CI_COMMIT_SHA} \
              -f ${MY_PATH} \
      		  --label "commit_sha=${CI_COMMIT_SHA}" \
              .
      done
    - |
      for IMAGE_NAME in $TO_PUSH
      do
          echo "***********************************"
          echo "Pushing ${IMAGE_NAME}"
          echo "-----------------------------------"
          echo "DOCKER_BUILDKIT=1 docker push ${CI_REGISTRY_IMAGE}/${IMAGE_NAME}:${CI_COMMIT_SHA}"
          echo "***********************************"
          docker push ${CI_REGISTRY_IMAGE}/${IMAGE_NAME}:${CI_COMMIT_SHA}
      done


.bpp:proxy:
  variables:
    # The names of jobs we want to proxy - if any of them succeeded, we proxy.
    BUILD_JOBS: ""
  script:
    - PROXY_TAG=latest
    - apt-get -qq update
    - apt-get -qq install jq
    # Get the successful jobs for the current pipeline
    - >-
      curl
      --header "PRIVATE-TOKEN:${GITLAB_TOKEN}"
      "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/pipelines/${CI_PIPELINE_ID}/jobs?scope[]=success"
      > jobs.json
    # Compare the job names from the pipeline with the provided job names
    - EXECUTED=$(comm -12 <(jq -r '.[].name' jobs.json | sort) <(echo ${BUILD_JOBS} | tr ' ' '\n' | sort))
    # If a build job was executed, we need to set the proxy tag to the current commit sha.
    - |
      if [ ! -z "$EXECUTED" ]
      then
          PROXY_TAG=${CI_COMMIT_SHA}
      fi
    - echo "PROXY_TAG=${PROXY_TAG}" >> deploy.env
    # Print out the proxy tag - for debug purposes
    - echo "PROXY_TAG=${PROXY_TAG}"
  artifacts:
    # To get the proxy tag, you need to get the artifacts from this job.
    # The proxy tag will be ${PROXY_TAG}
    reports:
      dotenv: deploy.env


.bpp:promote:
  variables:
    # The names of the images you wish to promote.
    # They need to have been built & pushed by a previous build step.
    TO_PROMOTE: ""
  script:
    - |
      if [ "${PROXY_TAG}" = "latest" ]; then
          echo "Nothing to promote."
      else
          echo "Promoting docker image."
          docker login -u ${CI_REGISTRY_USER} -p ${CI_REGISTRY_PASSWORD} ${CI_REGISTRY_IMAGE}

          for IMAGE in ${TO_PROMOTE} ; do
              docker pull ${CI_REGISTRY_IMAGE}/${IMAGE}:${CI_COMMIT_SHA}
              docker tag ${CI_REGISTRY_IMAGE}/${IMAGE}:${CI_COMMIT_SHA} ${CI_REGISTRY_IMAGE}/${IMAGE}:latest
              docker push ${CI_REGISTRY_IMAGE}/${IMAGE}:latest
          done
      fi
```

