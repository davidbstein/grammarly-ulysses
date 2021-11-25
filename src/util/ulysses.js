const exp = require("constants");
const fs = require("fs");
const path = require("path");
const process = require("process");
const bplist = require("bplist-parser");

function getDirectories() {
  const homeDir = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  const iCloudDir = path.join(homeDir, "Library", "Mobile Documents");
  // list filnames in iCloudDir that contain "com~soulmen~ulysses3"
  const ulyssesDir = fs
    .readdirSync(iCloudDir)
    .filter((fileName) => fileName.includes("com~soulmen~ulysses3"))[0];
  const ulyssesLibraryDir = path.join(iCloudDir, ulyssesDir, "Documents", "Library");
  const groupsDir = path.join(ulyssesLibraryDir, "Groups-ulgroup");
  const trashDir = path.join(ulyssesLibraryDir, "Trash-ultrash");
  const unfiledDir = path.join(ulyssesLibraryDir, "Unfiled-ulgroup");
  return { groupsDir, trashDir, unfiledDir };
}

function getGroupTree(dir) {
  const groupTree = {};
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      if (file.endsWith("-ulgroup")) {
        groupTree[file] = expandUlGroup(filePath);
      } else {
        groupTree[file] = getGroupTree(filePath);
      }
    } else {
      if (file.endsWith(".DS_Store")) {
        // ignore
      } else {
        groupTree[file] = filePath;
      }
    }
  });
  return groupTree;
}

async function expandUlGroup(groupDir) {
  const infoPath = path.join(groupDir, "Info.ulgroup");
  if (!fs.existsSync(infoPath)) {
    return {};
  }
  const parsedInfo = await bplist.parseFile(infoPath, (err) => {
    console.error(err);
  });
  const children = [];
  const childOrder = parsedInfo[0].childOrder || []; // TODO: resolutionData and Clusters...
  for (const childName of childOrder) {
    const childPath = path.join(groupDir, childName);
    const child = await expandUlGroup(childPath);
    children.push(child);
  }
  return {
    ...parsedInfo[0],
    children: children,
  };
}

async function main() {
  const { groupsDir } = getDirectories();
  const group = await expandUlGroup(groupsDir);
  console.log(group);
}

main();
