# Overview

A web scraper that crawls through a list of websites in websites.csv and generates a logo.csv with their logo URLs

# How to Run

This project uses the nix package manager, so install it and start a shell in the project's root with the default.nix file config. Then, run the following commands:

```shell

#install dependencies
pnpm install

#run the project
#the number is the amount of concurrent websites requests. Choose a number that reflects the amount of CPU and RAM resources you have
pnpm start 200

```
