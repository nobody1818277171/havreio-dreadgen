import {augBalance, apply, augment} from "./augApply.js";
//unused
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let results = [];

let gotBodies = [];
let gotWeps = [];

const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const startlvl = config.startingLevel
const tierLevels = config.levelsPerTier
const tiers = config.tiers
const hexers = config.doesHex
const fixed = config.usesFixed
const fixedLevels = config.fixedTierLevels
const hpMult = config.hpMult
//planned structure
//index = by tier array
//tier array = w array and b array
//this creates a list of all possible combinations
const WBarray = [[],[]]
let map = [WBarray, WBarray, WBarray, WBarray, WBarray, WBarray]; //expand if you use more than this!

const bodyPath = path.join(__dirname, 'bodies');
const wepPath = path.join(__dirname, 'weps');
const presetPath = path.join(__dirname, 'resource', 'preset.json');

const johnDreadnoughtPath = path.join(__dirname, 'resource', 'Dreadnoughts.json');;

const johnDreadnought = JSON.parse(fs.readFileSync(johnDreadnoughtPath, 'utf8'));

let presetJson = JSON.parse(fs.readFileSync(presetPath, 'utf8'));

let tierOne = startlvl + tierLevels

if (fixed) {
  tierOne = fixedLevels[0]
}


function addMissing(part) {
  if (part.advancedObjectDef.barrels == undefined) {
      part.advancedObjectDef.barrels = []
      console.log("part has no barrel field, adding.")
  }
  if (part.advancedObjectDef.autoTurrets == undefined) {
      part.advancedObjectDef.autoTurrets = []
      console.log("part has no turrets field, adding.")
  }
}


function exportTank(def) { //try {
    //fs.writeFileSync('out/'+def.name+'.json', JSON.stringify(def, null, 2));
    //} catch (err) {console.log(err.message)}

    //the goal now is to prepare the tank to be inserted into a preset.
    let presetFields = {
            customDef: def,
            levelRequirement: def.Dtier*tierLevels+startlvl,
            name: def.name,
            upgradesFrom: [], // it will be filled now
            isDisabled: false
          }
    if (fixed) {
      try {
        presetFields.levelRequirement = fixedLevels[def.Dtier - 1]
      } catch (err) {
        console.log(err)
        console.log("fixedTierLevels' array is probably incorrect, maybe you forgot how many tiers you have?")
      }
    }
    if (def.allDMeta[0].Dtier != 1) { //if we're not the first tier
      if (hexers[def.allDMeta[0].Dtier - 2]) { //check if last tier is hexnoughts
        let wepUpgradeFrom = def.allDMeta[0].DupgradesFrom //as a hexa this is the "front"'s upgrades from
        let bodUpgradeFrom = def.allDMeta[1].DupgradesFrom
        wepUpgradeFrom.forEach(wepFrom => {
          map[def.allDMeta[0].Dtier - 2][0].forEach(wep2 => { //use the map to get the name of other hexa parts in this tier
            let combinedName = ""
            if (wepFrom == wep2) {
              combinedName = wepFrom + " II" //if duplicated, name is turned into Weapon II
            } else {
              combinedName = wepFrom + "-" + wep2 //Weapon-Weapon2
            }
            bodUpgradeFrom.forEach(bodFrom => {
            presetFields.upgradesFrom.push(combinedName+"-"+bodFrom) //Weapon-Weapon2-Body || Weapon II-Body
            })
          })
        })
      } else {
        let wepUpgradeFrom = def.allDMeta[0].DupgradesFrom
        let bodUpgradeFrom = def.allDMeta[1].DupgradesFrom
        wepUpgradeFrom.forEach(wepFrom => {
          bodUpgradeFrom.forEach(bodFrom => {
            presetFields.upgradesFrom.push(wepFrom+"-"+bodFrom)
      })
    })
      }
    } else {
      presetFields.upgradesFrom = [johnDreadnought.name] //Since tier is 1, it will upgrade from root.
    }
    
  presetJson.tanks.push(presetFields) //Push to the jSON
}

function addMeta(part) {
  let input = part.upgradeMessage
  let split = input.split("-") //take apart the upgradeMessage
  
  part.DsearchType = split[0] //get type of weapon
  part.DupgradesFrom = split[1].split(",") //get Upgradesfrom, which can be multiple parts
  part.Dtier = split[2] //get tier
  part.upgradeMessage = "" //clear uppgrademessage

  let mapTier = split[2] - 1
  let mapType = split[0]
  let mapSide = 0 //sorry
  if (mapType == 'w') {
    mapSide = 0
  } else {
    mapSide = 1
  }
  //ASSuming json name is same as real tank name (of course it is)
  map[mapTier][mapSide].push([part.name])

  console.log(JSON.stringify(part, null, 2))
}

function combineMeta(w, b) {
  //w [0], b [1].
  return [{"DsearchType": w.DsearchType, "DupgradesFrom": w.DupgradesFrom, "Dtier": w.Dtier},{"DsearchType": b.DsearchType, "DupgradesFrom": b.DupgradesFrom, "Dtier": b.Dtier}]
} 

function rotateAll(def, angle) {
  let copy = JSON.parse(JSON.stringify(def))
  copy.advancedObjectDef.barrels.forEach(function (foo) {
    foo.angle += angle
  })
  copy.advancedObjectDef.autoTurrets.forEach(function (foo) {
    foo.angle += angle
  })
  return copy
}


function combine(currentWep, currentBody, setting) {
  if (setting) {
  setting.hex = setting?.hex || false
  }
  let definition = JSON.parse(JSON.stringify(currentBody)); //copy shit

  definition.advancedObjectDef.barrels = [...currentBody.advancedObjectDef.barrels, ...currentWep.advancedObjectDef.barrels]; 
  definition.advancedObjectDef.autoTurrets = [...currentBody.advancedObjectDef.autoTurrets, ...currentWep.advancedObjectDef.autoTurrets]; //this is all merging
  //stat

  let cbFov = currentBody.fovFactor ?? 1
  let cwFov = currentWep.fovFactor ?? 1

  if (!(setting?.hex)) { //we are not hex
    augment(definition)
    definition.fovFactor = cbFov * cwFov
  } else { //if we are hex
    if (cbFov <= cwFov) { //pick highest fov if hexadread
      definition.fovFactor = cwFov
    } else {
      definition.fovFactor = cbFov
    }
  }

  if (!(definition?.statFactors?.health)) {
      if (!(definition?.statFactors)) {
        definition.statFactors = {} //inits statFactors if they dont exist
      }
      definition.statFactors.health = hpMult // 1 * 1.5 = 1.5
    } else {
      definition.statFactors.health *= hpMult 
  }
  //unused
 
  
  //name, meta
  if (currentWep.name == currentBody.name) {
    definition.name = currentWep.name + " II" //if duped, make it II for hexnoughts
  } else {
  definition.name = currentWep.name + '-' + currentBody.name
  }
  if (!(setting?.hex)) {
    definition.allDMeta = combineMeta(currentWep, currentBody)
  } else { // if hexnought prepare the single component with the "front"'s meta
    definition.DsearchType = "w"
    definition.DupgradesFrom = currentWep.DupgradesFrom
    definition.Dtier = currentWep.Dtier
  }
  return definition
}
try {
  const bodies = fs.readdirSync(bodyPath);
  const weps = fs.readdirSync(wepPath);
  // Collection
  // read defs from files, prepare them to be processed
  bodies.forEach(element => {
    let body = JSON.parse(fs.readFileSync(path.join(bodyPath, element), 'utf8'));
    addMissing(body)
    addMeta(body)
    gotBodies.push(body);
    console.log("Pushed "+ body.name)
  });

  weps.forEach(element => {
    let wep = JSON.parse(fs.readFileSync(path.join(wepPath, element), 'utf8'));
    addMissing(wep)
    addMeta(wep)
    gotWeps.push(wep);
    console.log("Pushed " + wep.name)
  });


  //go my dread generator!

  //we gotta add the dreadnutter first

  let rootDread = {
            customDef: johnDreadnought, //Dreadnoughts.json at resource/
            levelRequirement: tierOne,
            name: johnDreadnought.name,
            upgradesFrom: [], // it will be filled now, god help us
            isDisabled: false
          }
  let newString = ""
  if (config.rootUpgradableTo) {
    presetJson.tanks.forEach(element => {
      if (element.levelRequirement >= 45) { 
        if (element.customDef === null) { //we generate the upgradekeys for level 45 tanks, because how the name is done this is doable. it is an entry for a default since customdef is null
          //regular tanks
          let ment = JSON.parse(JSON.stringify(element)) 
          let name = ment.name
          let words = name.split(" ")
          if (words.length == 1) {
            words = words[0].split("-") //name has dash
          }
          words[0] = words[0].toLowerCase()
          words.forEach(word => {
            newString += word
          })
          console.log(newString)
          rootDread.upgradesFrom.push(newString)
          newString = ""
      } else {
        //added custom tanks that were in the preset already
        rootDread.upgradesFrom.push(element.name)
      }
    }
  })
  }
  presetJson.tanks.push(rootDread) //adds final johndread to json



  let currentBody = null;
  gotBodies.forEach(bodo => { //loop through bodies
    console.log(bodo.name)
    currentBody = JSON.parse(JSON.stringify(bodo)) //copy
    gotWeps.forEach(wepo => { //loop through weps
      console.log(wepo.name)
      let currentWep = JSON.parse(JSON.stringify(wepo)) //copy
      if (wepo.Dtier == bodo.Dtier) { //if their tier match, they must be combined
        if (hexers[wepo.Dtier - 1]) { //if tier is hexed
          gotWeps.forEach(wepo2 => { //loop through weps again
            if (wepo2.Dtier == wepo.Dtier) { //if their ti- i already said that
              let currentWep2 = JSON.parse(JSON.stringify(wepo2)) //copy
              results.push(combine(combine(currentWep, rotateAll(currentWep2, 180), {hex: true}), currentBody)) //only for genius
            }
          })
        } else {
          results.push(combine(currentWep, currentBody)) //regular combine
        }
      }
  });});

  results.forEach(function (def) {
    exportTank(def) //when done, export all tanks
    
  });

  
  try {
  const genedPath = path.join(__dirname, 'out', 'autogen.json'); //write presetJson to autogen.json
  fs.writeFileSync(genedPath, JSON.stringify(presetJson, null, 2));
  console.log("Succesful, check out/autogen!")
    } catch (err) {console.log(err.message)}
} catch (err) {
  console.error(err);
}
