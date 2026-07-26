export function augBalance(augment, barrel) {
    let augCopy = JSON.parse(JSON.stringify(augment))
    augCopy.advancedObjectDef.barrels.forEach(augBarrel => {
        console.log(augBarrel)
        let health = augBarrel.stats.bulletDef?.healthFactor || 1
        let damage = augBarrel.stats.bulletDef?.damageFactor || 1
        augBarrel.stats.bulletDef.healthFactor = health * (barrel.stats.bulletDef.healthFactor || 1)
        augBarrel.stats.bulletDef.damageFactor = damage * (barrel.stats.bulletDef.damageFactor || 1)

    })
    return augCopy
}





export function apply(augment, def) {
    let rootBarrels = def.advancedObjectDef?.barrels
    let rootTurrets = def.advancedObjectDef?.autoTurrets
    if (rootBarrels) {
        rootBarrels.forEach(barrel => {
            if (!(barrel?.stats?.bulletDef)) {
                if (!(barrel?.stats)) {
                    barrel.stats = {}
                }
                barrel.stats.bulletDef = {}
            }
            if (!(barrel?.stats?.bulletDef?.advancedObjectDef)) {
                barrel.stats.bulletDef.advancedObjectDef = {}
            } else {
                apply(augment, barrel.stats.bulletDef)
            }
            let path = barrel?.stats?.bulletDef?.advancedObjectDef?.autoTurrets
            if (!(path)) {
                barrel.stats.bulletDef.advancedObjectDef.autoTurrets = []
            }
            barrel.stats.bulletDef.advancedObjectDef.autoTurrets.push(augBalance(augment, barrel))
            console.log("Aug applied")
        })
    }
    if (rootTurrets) {
        rootTurrets.forEach(turret => {
            apply(augment, turret)
        })
    }
}




export function augment(def) {
    let rootBarrels = def.advancedObjectDef.barrels
    let rootTurrets = def.advancedObjectDef.autoTurrets
    if (rootTurrets) {
        rootTurrets.forEach((turret, idx) => {
            if (turret.name == "Daug") {
                let newCopy = JSON.parse(JSON.stringify(turret))
                rootTurrets.splice(idx,1)
                apply(newCopy, def)
            }
        });
    }
}