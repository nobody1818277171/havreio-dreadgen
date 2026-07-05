const fs = require('fs');
const path = require('path');

let results = [];

let gotBodies = [];
let gotWeps = [];

const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const startlvl = config.startingLevel
const tierLevels = config.levelsPerTier
const tiers = config.tiers

//planned structure
//index = by tier array
//tier array = w array and b array
//this creates a list of all possible combinations
const WBarray = [[],[]]
let map = [WBarray, WBarray, WBarray, WBarray, WBarray]; //hard coding this for now

const bodyPath = path.join(__dirname, 'bodies');
const wepPath = path.join(__dirname, 'weps');
const presetPath = path.join(__dirname, 'resource', 'preset.json');

const johnDreadnoughtPath = path.join(__dirname, 'resource', 'Dreadnoughts.json');;

const johnDreadnought = JSON.parse(fs.readFileSync(johnDreadnoughtPath, 'utf8'));

let presetJson = JSON.parse(fs.readFileSync(presetPath, 'utf8'));


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
    let wepUpgradeFrom = def.allDMeta[0].DupgradesFrom
    if (wepUpgradeFrom == "Root") {
      presetFields.upgradesFrom = [johnDreadnought.name]
    } else {
    let bodUpgradeFrom = def.allDMeta[1].DupgradesFrom
    wepUpgradeFrom.forEach(wepFrom => {
      bodUpgradeFrom.forEach(bodFrom => {
        presetFields.upgradesFrom.push(wepFrom+"-"+bodFrom)
      })
    })
  }
  presetJson.tanks.push(presetFields)
}

function addMeta(part) {
  let input = part.upgradeMessage
  let split = input.split("-")
  
  part.DsearchType = split[0]
  part.DupgradesFrom = split[1].split(",")
  part.Dtier = split[2]
  part.upgradeMessage = ""

  let mapTier = split[2] - 1
  let mapType = split[0]
  let mapSide = 0
  if (mapType == 'w') {
    mapSide = 0
  } else {
    mapSide = 1
  }
  //ASSuming json name is same as real tank name
  map[mapTier][mapSide].push([part.name])

  console.log(JSON.stringify(part, null, 2))
}

function combineMeta(w, b) {
  //w [0], b [1].
  return [{"DsearchType": w.DsearchType, "DupgradesFrom": w.DupgradesFrom, "Dtier": w.Dtier},{"DsearchType": b.DsearchType, "DupgradesFrom": b.DupgradesFrom, "Dtier": b.Dtier}]
} 
try {
  const bodies = fs.readdirSync(bodyPath);
  const weps = fs.readdirSync(wepPath);
  // Collection
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
            customDef: johnDreadnought,
            levelRequirement: 1*tierLevels+startlvl,
            name: johnDreadnought.name,
            upgradesFrom: [], // it will be filled now, god help us
            isDisabled: false
          }
  let newString = ""
  presetJson.tanks.forEach(element => {
    if (element.levelRequirement >= 45) {
      if (element.customDef === null) {
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
      //added custom tanks
      rootDread.upgradesFrom.push(element.name)
    }
    }
  })
  presetJson.tanks.push(rootDread)






  let currentBody = null;
  gotBodies.forEach(bodo => {
    console.log(bodo.name)
    currentBody = bodo
    gotWeps.forEach(wepo => {
      console.log(wepo.name)
      let currentWep = wepo
      if (wepo.Dtier == bodo.Dtier) {
        //combining traits...
        //HELP
        let definition = JSON.parse(JSON.stringify(currentBody)); //i would have never figured this out... smh

        definition.advancedObjectDef.barrels = [...currentBody.advancedObjectDef.barrels, ...currentWep.advancedObjectDef.barrels];
        definition.advancedObjectDef.autoTurrets = [...currentBody.advancedObjectDef.autoTurrets, ...currentWep.advancedObjectDef.autoTurrets];
        definition.name = currentWep.name + '-' + currentBody.name

        definition.allDMeta = combineMeta(currentWep, currentBody)
        results.push(definition);
        console.log(definition.name);
      }
  });});

  results.forEach(function (def) {
    exportTank(def)
    
  });

  
  try {
  const genedPath = path.join(__dirname, 'out', 'autogen.json');
  fs.writeFileSync(genedPath, JSON.stringify(presetJson, null, 2));
    } catch (err) {console.log(err.message)}
} catch (err) {
  console.error(err);
}