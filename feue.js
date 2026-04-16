// Fire Emblem: Ultimate Edition system for Foundry VTT
// Clean rewrite without sanitizers

// ====================================================================
// 1. CONSTANTS
// ====================================================================
const FEUE = {
    WEAPON_RANKS: {
        "": { order: -1, label: "—" },
        "E": { order: 0, label: "E" },
        "D": { order: 1, label: "D" },
        "C": { order: 2, label: "C" },
        "B": { order: 3, label: "B" },
        "A": { order: 4, label: "A" },
        "S": { order: 5, label: "S" }
    },
    AFFINITIES: ["Fire", "Thunder", "Wind", "Ice", "Earth", "Dark", "Light", "Anima"],
    UNIT_TYPES: ["Infantry", "Mounted", "Flying", "Dragon", "Armored", "Magician", "Beast", "Mechanical", "Monster"],
    CLASS_TYPES: ["Recruit", "Standard", "Promoted", "Advanced", "Enemy Only"],
    MAG_WEAPON_TYPES: ["anima", "light", "dark", "staff", "stone"],
    STAT_KEYS: ["hp", "strength", "magic", "skill", "speed", "defense", "resistance", "luck", "charm", "build"],
    STAT_LABELS: { hp: "HP", strength: "Str", magic: "Mag", skill: "Skl", speed: "Spd", defense: "Def", resistance: "Res", luck: "Lck", charm: "Cha", build: "Bld" },
    WeaponTypes: {
        "sword": "Sword", "lance": "Lance", "axe": "Axe", "bow": "Bow",
        "firearm": "Firearm", "unarmed": "Unarmed", "knife": "Knife",
        "anima": "Anima", "light": "Light", "dark": "Dark",
        "staff": "Staff", "monster": "Monster", "stone": "Stone"
    },
    STATUS_EFFECTS: [
        "Berserk", "Silence", "Sleep", "Poison", "Petrification",
        "Paralysis", "Shock", "Rattled", "Confusion", "Blood Sacrifice",
        "Burning", "Buffeted", "Frozen", "Guard Break", "Knocked Out"
    ],
    SUPPORT_RANKS: ["C", "B", "A", "S"],
    SUPPORT_RANK_MULTIPLIER: { C: 1, B: 2, A: 3, S: 4 },
    AFFINITY_BONUSES: {
        Fire: { primary: "Atk", secondary: "Hit", pVal: 1, sVal: 1 },
        Thunder: { primary: "Def", secondary: "Avo", pVal: 1, sVal: 1 },
        Wind: { primary: "AS", secondary: "Avo", pVal: 1, sVal: 1 },
        Ice: { primary: "Res", secondary: "Dodge", pVal: 1, sVal: 1 },
        Earth: { primary: "Avo", secondary: "Dodge", pVal: 1, sVal: 1 },
        Dark: { primary: "Crit", secondary: "Atk", pVal: 1, sVal: 1 },
        Light: { primary: "Hit", secondary: "Crit", pVal: 1, sVal: 1 },
        Anima: { primary: "Dodge", secondary: "Res", pVal: 1, sVal: 1 }
    }
};

FEUE.WEAPON_RANK_ARTS = {
    sword: {
        D: [{ name: "Wrath Strike", might: 5, hit: 10, crit: 0, durabilityCost: 3, effect: "No additional effect." }],
        C: [{ name: "Grounder", might: 3, hit: 10, crit: 0, durabilityCost: 3, effect: "Effective against flying." }],
        B: [{ name: "Soulblade", might: 0, hit: 10, crit: 10, durabilityCost: 3, effect: "Adds RES to damage." }],
        A: [{ name: "Hexblade", might: 8, hit: 0, crit: 0, durabilityCost: 4, effect: "Targets enemy RES." }],
        S: [{ name: "Sublime Heaven", might: 10, hit: 10, crit: 20, durabilityCost: 5, effect: "Effective against dragons." }]
    },
    lance: {
        D: [{ name: "Tempest Lance", might: 8, hit: 0, crit: 0, durabilityCost: 4, effect: "No additional effect." }],
        C: [{ name: "Knightkneeler", might: 6, hit: 10, crit: 0, durabilityCost: 3, effect: "Effective against cavalry." }],
        B: [{ name: "Lance Jab", might: 3, hit: 0, crit: 0, durabilityCost: 3, effect: "Follow-up attack." }],
        A: [{ name: "Glowing Ember", might: 0, hit: 0, crit: 0, durabilityCost: 4, effect: "Adds DEF to damage." }],
        S: [{ name: "Paraselene", might: 10, hit: 5, crit: 10, durabilityCost: 5, effect: "Grants +5 DEF for 1 turn." }]
    },
    axe: {
        D: [{ name: "Smash", might: 3, hit: 20, crit: 0, durabilityCost: 3, effect: "No additional effect." }],
        C: [{ name: "Helm Splitter", might: 7, hit: 0, crit: 0, durabilityCost: 4, effect: "Effective against armored." }],
        B: [{ name: "Focused Strike", might: 3, hit: 30, crit: 0, durabilityCost: 3, effect: "No additional effect." }],
        A: [{ name: "Lightning Axe", might: 0, hit: 0, crit: 0, durabilityCost: 4, effect: "Adds RES to damage. Targets enemy RES." }],
        S: [{ name: "Apocalyptic Flame", might: 12, hit: 0, crit: 10, durabilityCost: 5, effect: "Effective against dragons." }]
    },
    bow: {
        D: [{ name: "Curved Shot", might: 1, hit: 30, crit: 0, durabilityCost: 3, effect: "+1 Range." }],
        C: [{ name: "Break Shot", might: 1, hit: 0, crit: 0, durabilityCost: 3, effect: "Inflicts -5 DEF on target." }],
        B: [{ name: "Heavy Draw", might: 8, hit: 0, crit: 0, durabilityCost: 3, effect: "Effective against armored." }],
        A: [{ name: "Ward Arrow", might: 0, hit: 0, crit: 0, durabilityCost: 4, effect: "Inflicts Silence." }],
        S: [{ name: "Hunter's Volley", might: 3, hit: 0, crit: 0, durabilityCost: 5, effect: "Attacks twice." }]
    },
    knife: {
        D: [{ name: "Shiv", might: 3, hit: 10, crit: 10, durabilityCost: 3, effect: "No additional effect." }],
        C: [{ name: "Assassinate", might: 5, hit: 0, crit: 30, durabilityCost: 4, effect: "No additional effect." }],
        B: [{ name: "Windsweep", might: 0, hit: 20, crit: 0, durabilityCost: 3, effect: "Target cannot counterattack." }],
        A: [{ name: "Lethality", might: 0, hit: -10, crit: 50, durabilityCost: 5, effect: "No additional effect." }],
        S: [{ name: "Foul Play", might: 0, hit: 0, crit: 0, durabilityCost: 3, effect: "Swap positions with an ally." }]
    },
    unarmed: {
        D: [{ name: "Fading Blow", might: 3, hit: 10, crit: 0, durabilityCost: 3, effect: "Grants +5 AVO for 1 turn." }],
        C: [{ name: "Rushing Blow", might: 5, hit: 0, crit: 0, durabilityCost: 3, effect: "Move +1 after attacking." }],
        B: [{ name: "Mystic Blow", might: 6, hit: 0, crit: 0, durabilityCost: 4, effect: "Targets enemy RES." }],
        A: [{ name: "Nimble Combo", might: 3, hit: 20, crit: 10, durabilityCost: 4, effect: "Attacks twice." }],
        S: [{ name: "Astra", might: 0, hit: 0, crit: 0, durabilityCost: 5, effect: "Attacks five times at half damage." }]
    },
    firearm: {
        D: [{ name: "Steady Shot", might: 0, hit: 20, crit: 0, durabilityCost: 3, effect: "No additional effect." }],
        C: [{ name: "Piercing Shot", might: 5, hit: 0, crit: 0, durabilityCost: 3, effect: "Ignores half of target DEF." }],
        B: [{ name: "Scatter Shot", might: -2, hit: -10, crit: 0, durabilityCost: 4, effect: "Hits all adjacent enemies." }],
        A: [{ name: "Deadeye", might: 3, hit: 0, crit: 30, durabilityCost: 4, effect: "+2 Range." }],
        S: [{ name: "Annihilation Round", might: 15, hit: -20, crit: 20, durabilityCost: 5, effect: "Effective against armored." }]
    }
};

const DEFAULT_WEAPON_RANKS = Object.fromEntries(
    Object.keys(FEUE.WeaponTypes).map(type => [type, ""])
);

// ====================================================================
// 2. ACTOR CLASS
// ====================================================================
class FireEmblemActor extends Actor {

    async _onCreate(data, options, userId) {
        super._onCreate(data, options, userId);
        if (game.user.id !== userId) return;
        await this._getOrCreateLevelUpBonus();
    }

    _blankBonuses() {
        return {
            attributes: { hp: 0, strength: 0, magic: 0, skill: 0, speed: 0, defense: 0, resistance: 0, luck: 0, charm: 0, build: 0, move: 0 },
            maximums: { hp: 0, strength: 0, magic: 0, skill: 0, speed: 0, defense: 0, resistance: 0, luck: 0, charm: 0, build: 0, move: 0 },
            growthRates: { hp: 0, strength: 0, magic: 0, skill: 0, speed: 0, defense: 0, resistance: 0, luck: 0, charm: 0, build: 0 },
            combat: { hitRate: 0, critRate: 0, avoid: 0, dodge: 0, attackSpeed: 0 }
        };
    }

    /** Parse skill activation text for bonus patterns like "+2 Strength", "+10 Hit", "+5% Growth HP", "+3 Max Def" */
    _parseSkillBonuses(text) {
        const result = this._blankBonuses();
        if (!text) return result;

        // Name → internal key mapping
        const STAT_MAP = {
            hp: "hp", "hit points": "hp",
            str: "strength", strength: "strength",
            mag: "magic", magic: "magic",
            skl: "skill", skill: "skill",
            spd: "speed", speed: "speed",
            def: "defense", defense: "defense",
            res: "resistance", resistance: "resistance",
            lck: "luck", luck: "luck",
            cha: "charm", charm: "charm",
            bld: "build", build: "build",
            move: "move", movement: "move"
        };
        const COMBAT_MAP = {
            hit: "hitRate", "hit rate": "hitRate",
            crit: "critRate", "crit rate": "critRate", critical: "critRate",
            avo: "avoid", avoid: "avoid",
            dodge: "dodge", dge: "dodge",
            as: "attackSpeed", "attack speed": "attackSpeed"
        };

        // Split on comma/semicolon/and, process each clause
        const clauses = text.split(/[,;]|\band\b/i).map(c => c.trim()).filter(Boolean);
        for (const clause of clauses) {
            // Growth rate: "+5% Growth HP"
            const growthMatch = clause.match(/([+-]?\d+)%?\s*growth\s+(.+)/i);
            if (growthMatch) {
                const val = Number(growthMatch[1]);
                const key = STAT_MAP[growthMatch[2].trim().toLowerCase()];
                if (key && key in result.growthRates) result.growthRates[key] += val;
                continue;
            }
            // Maximum: "+5 Max Strength"
            const maxMatch = clause.match(/([+-]?\d+)\s*max\s+(.+)/i);
            if (maxMatch) {
                const val = Number(maxMatch[1]);
                const key = STAT_MAP[maxMatch[2].trim().toLowerCase()];
                if (key && key in result.maximums) result.maximums[key] += val;
                continue;
            }
            // Attribute or combat: "+2 Strength", "+10 Hit"
            const statMatch = clause.match(/([+-]?\d+)\s+(.+)/i);
            if (statMatch) {
                const val = Number(statMatch[1]);
                const name = statMatch[2].trim().toLowerCase();
                if (COMBAT_MAP[name]) {
                    result.combat[COMBAT_MAP[name]] += val;
                } else if (STAT_MAP[name] && STAT_MAP[name] in result.attributes) {
                    result.attributes[STAT_MAP[name]] += val;
                }
            }
        }
        return result;
    }

    _collectBonuses() {
        const totals = this._blankBonuses();
        const bonusItems = this.items.filter(i => {
            if (i.type === "skill") return true;
            if (i.type === "item") {
                // Equippable items only grant bonuses when equipped
                if (i.system.itemType === "equippable") return i.system.equipped === true;
                return true; // Consumables always apply their bonuses (if any)
            }
            if (i.type === "miscBonus" && i.system?.enabled !== false) return true;
            return false;
        });
        const equippedWeapon = this.items.find(i => i.type === "weapon" && i.system?.equipped);
        if (equippedWeapon) bonusItems.push(equippedWeapon);
        for (const item of bonusItems) {
            const b = item.system?.bonuses || {};
            for (const k of Object.keys(totals.attributes)) totals.attributes[k] += Number(b.attributes?.[k] || 0);
            for (const k of Object.keys(totals.maximums)) totals.maximums[k] += Number(b.maximums?.[k] || 0);
            for (const k of Object.keys(totals.growthRates)) totals.growthRates[k] += Number(b.growthRates?.[k] || 0);
            for (const k of Object.keys(totals.combat)) totals.combat[k] += Number(b.combat?.[k] || 0);

            // Parse skill activation text for additional bonuses
            if (item.type === "skill" && item.system?.activation) {
                const parsed = this._parseSkillBonuses(item.system.activation);
                for (const k of Object.keys(totals.attributes)) totals.attributes[k] += parsed.attributes[k];
                for (const k of Object.keys(totals.maximums)) totals.maximums[k] += parsed.maximums[k];
                for (const k of Object.keys(totals.growthRates)) totals.growthRates[k] += parsed.growthRates[k];
                for (const k of Object.keys(totals.combat)) totals.combat[k] += parsed.combat[k];
            }
        }
        return totals;
    }

    /** Find or create the permanent "Bonuses from Level Up" miscBonus item. */
    async _getOrCreateLevelUpBonus() {
        let bonus = this.items.find(i =>
            i.type === "miscBonus" && i.getFlag("feue", "isLevelUpBonus")
        );
        if (!bonus) {
            const [created] = await this.createEmbeddedDocuments("Item", [{
                name: "Bonuses from Level Up",
                type: "miscBonus",
                img: "icons/svg/upgrade.svg",
                system: {
                    enabled: true,
                    bonuses: {
                        attributes: { hp: 0, strength: 0, magic: 0, skill: 0, speed: 0, defense: 0, resistance: 0, luck: 0, charm: 0, build: 0, move: 0 },
                        maximums: { hp: 0, strength: 0, magic: 0, skill: 0, speed: 0, defense: 0, resistance: 0, luck: 0, charm: 0, build: 0, move: 0 },
                        growthRates: { hp: 0, strength: 0, magic: 0, skill: 0, speed: 0, defense: 0, resistance: 0, luck: 0, charm: 0, build: 0 },
                        combat: { hitRate: 0, critRate: 0, avoid: 0, dodge: 0, attackSpeed: 0 }
                    }
                },
                flags: { feue: { isLevelUpBonus: true } }
            }]);
            bonus = created;
        }
        return bonus;
    }

    /** Walk the promotion tree via currentPath to find the active class node. */
    _getCurrentClassNode(classItem) {
        const sys = classItem.system;
        let node = {
            name: classItem.name, classType: sys.classType, movement: sys.movement,
            maxLevel: sys.maxLevel, baseStats: sys.baseStats || {},
            growthRates: sys.growthRates || {}, statCaps: sys.statCaps || {},
            unitTypes: sys.unitTypes || {}, weaponProficiencies: sys.weaponProficiencies || {},
            classSkills: Array.isArray(sys.classSkills) ? sys.classSkills : [],
            promotions: sys.promotions || []
        };
        for (const id of (sys.currentPath || [])) {
            const next = (node.promotions || []).find(p => p.id === id);
            if (!next) break;
            node = next;
        }
        return node;
    }

    prepareDerivedData() {
        const system = this.system;

        // Weapon ranks
        system.weaponRanks = foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_WEAPON_RANKS), system.weaponRanks || {}, { overwrite: true });
        for (const key of Object.keys(DEFAULT_WEAPON_RANKS)) {
            if (system.weaponRanks[key] === undefined || Array.isArray(system.weaponRanks[key])) system.weaponRanks[key] = "";
        }

        // Resolve equipped class node
        const equippedClass = this.items.find(i => i.type === "class" && i.system?.equipped);
        let baseStats = {}, growths = {}, caps = {}, classMovement = 0;

        if (equippedClass) {
            const node = this._getCurrentClassNode(equippedClass);
            system.activeClassName = node.name;
            system.activeClassType = node.classType;
            baseStats = foundry.utils.deepClone(node.baseStats || {});
            growths = foundry.utils.deepClone(node.growthRates || {});
            caps = foundry.utils.deepClone(node.statCaps || {});
            classMovement = Number(node.movement || 0);
        }

        system.attributes ??= {};
        const bonus = this._collectBonuses();

        for (const k of FEUE.STAT_KEYS) {
            system.attributes[k] ??= { value: 0, max: 0 };
            const base = Number(baseStats[k] || 0);
            const cap = Number(caps[k] || 0);

            if (k === "hp") {
                // HP special: max = HP stat, value = current HP (user-managed)
                system.attributes.hp.max = base + (bonus.attributes.hp || 0);
                if (system.attributes.hp.value > system.attributes.hp.max && system.attributes.hp.max > 0) {
                    system.attributes.hp.value = system.attributes.hp.max;
                }
            } else {
                system.attributes[k].value = base + (bonus.attributes[k] || 0);
                system.attributes[k].max = cap + (bonus.maximums[k] || 0);
            }
        }

        system.growthRates ??= {};
        for (const k of FEUE.STAT_KEYS) {
            system.growthRates[k] = (growths[k] || 0) + (bonus.growthRates[k] || 0);
        }

        const battalion = this.items.find(i => i.type === "battalion");
        const batPenalty = Number(battalion?.system?.movePenalty || 0);
        system.movement ??= { base: 0, current: 0 };
        system.movement.base = classMovement + (bonus.attributes.move || 0) + batPenalty;

        // Combat stats
        const ew = this.items.find(i => i.type === "weapon" && i.system?.equipped);
        const wHit = Number(ew?.system?.hit || 0), wCrit = Number(ew?.system?.crit || 0), wWeight = Number(ew?.system?.weight || 0);
        const bld = Number(system.attributes.build?.value || 0);
        const spd = Number(system.attributes.speed?.value || 0);
        const skl = Number(system.attributes.skill?.value || 0);
        const lck = Number(system.attributes.luck?.value || 0);
        const as = spd - Math.max(wWeight - bld, 0) + (bonus.combat.attackSpeed || 0);

        const baseHitRate = skl + Math.floor(lck / 4) + (bonus.combat.hitRate || 0);
        const baseCritRate = Math.floor(skl / 2) + (bonus.combat.critRate || 0);

        // Damage: weapon might + relevant stat
        let damage = 0;
        if (ew) {
            const di = this.getDamageStat(ew.system.weaponType);
            damage = Number(ew.system.might || 0) + di.value;
        }

        // Aid: depends on unit type and sex
        const unitTypes = Array.isArray(system.unitTypes) ? system.unitTypes : [];
        const sex = (system.personalDetails?.sex || "").toLowerCase();
        const isMountedOrFlying = unitTypes.some(t => ["Mounted", "Flying"].includes(t));
        let aid = Math.max(bld - 1, 0); // Infantry default
        if (isMountedOrFlying) {
            aid = (sex === "female" || sex === "f") ? (20 - bld) : (25 - bld);
        }

        system.combat = {
            attackSpeed: as,
            baseHitRate,
            baseCritRate,
            hitRate: baseHitRate + wHit,
            critRate: baseCritRate + wCrit,
            avoid: spd + Math.floor(lck / 4) + (bonus.combat.avoid || 0),
            dodge: lck + (bonus.combat.dodge || 0),
            damage,
            aid
        };
    }

    async levelUp() {
        const system = this.system;
        const currentLevel = system.level || 1;

        // ── Check if at max level → promotion instead of normal level up ──
        const ec = this.items.find(i => i.type === "class" && i.system?.equipped);
        if (ec) {
            const node = this._getCurrentClassNode(ec);
            const maxLevel = Number(node.maxLevel || 20);
            const promos = node.promotions || [];

            if (currentLevel >= maxLevel) {
                if (promos.length) {
                    await this._showPromotionDialog(ec, promos);
                } else {
                    ui.notifications.warn(`${this.name} is at max level (${maxLevel}) with no promotions available.`);
                }
                return;
            }
        }

        // ── Normal level up ──
        const gr = system.growthRates || {};
        const accumulated = foundry.utils.deepClone(system.accumulatedGrowthRates || {});
        const gains = {};
        const newAccumulated = {};
        const rollDetails = [];

        for (const stat of FEUE.STAT_KEYS) {
            const baseGR = Number(gr[stat] || 0);
            const accum = Number(accumulated[stat] || 0);
            const effectiveGR = baseGR + accum;

            // Check stat cap first
            let atCap = false;
            if (stat === "hp") {
                if (ec) {
                    const nodeHp = this._getCurrentClassNode(ec);
                    const hpCap = Number(nodeHp.statCaps?.hp || 0);
                    if (hpCap > 0 && Number(system.attributes?.hp?.max || 0) >= hpCap) atCap = true;
                }
            } else {
                const currentVal = Number(system.attributes?.[stat]?.value || 0);
                const cap = Number(system.attributes?.[stat]?.max || 0);
                if (cap > 0 && currentVal >= cap) atCap = true;
            }

            if (atCap) {
                gains[stat] = 0;
                newAccumulated[stat] = 0;
                rollDetails.push({ stat, roll: "—", effectiveGR, gained: 0, atCap: true });
                continue;
            }

            if (effectiveGR >= 10) {
                // Guaranteed +1, plus +1 per additional 10 above threshold
                const gained = 1 + Math.floor((effectiveGR - 10) / 10);
                gains[stat] = gained;
                newAccumulated[stat] = effectiveGR % 10;
                rollDetails.push({ stat, roll: "auto", effectiveGR, gained, atCap: false });
            } else {
                const roll = await new Roll("1d10").evaluate();
                const sum = roll.total + effectiveGR;
                if (sum >= 10) {
                    gains[stat] = 1;
                    newAccumulated[stat] = 0;
                    rollDetails.push({ stat, roll: roll.total, effectiveGR, gained: 1, atCap: false });
                } else {
                    gains[stat] = 0;
                    newAccumulated[stat] = sum;
                    rollDetails.push({ stat, roll: roll.total, effectiveGR, gained: 0, atCap: false, carried: sum });
                }
            }
        }

        // Persist accumulated growth rates
        await this.update({ "system.accumulatedGrowthRates": newAccumulated });

        const gainedStats = Object.entries(gains).filter(([, v]) => v > 0);

        if (gainedStats.length) {
            const bonusItem = await this._getOrCreateLevelUpBonus();
            const updates = {};
            for (const [stat, amount] of gainedStats) {
                const current = Number(bonusItem.system.bonuses?.attributes?.[stat] || 0);
                updates[`system.bonuses.attributes.${stat}`] = current + amount;
            }
            await bonusItem.update(updates);

            if (gains.hp) {
                await this.update({
                    "system.attributes.hp.value": (system.attributes?.hp?.value || 0) + gains.hp
                });
            }
        }

        const newLevel = currentLevel + 1;
        await this.update({ "system.level": newLevel, "system.totalLevel": (system.totalLevel || 1) + 1 });

        // Build detailed chat message
        const detailRows = rollDetails.map(d => {
            const label = FEUE.STAT_LABELS[d.stat] || d.stat;
            if (d.atCap) return `<tr><td>${label}</td><td colspan="3" style="color:#888;">At cap</td></tr>`;
            const rollStr = d.roll === "auto" ? "Auto" : String(d.roll);
            const resultStr = d.gained > 0
                ? `<span class="gain">+${d.gained}</span>`
                : (d.carried ? `<span style="color:#b8860b;">Carry ${d.carried}</span>` : `<span style="color:#888;">—</span>`);
            return `<tr><td>${label}</td><td>${rollStr}</td><td>GR ${d.effectiveGR}</td><td>${resultStr}</td></tr>`;
        }).join("");

        const gainList = gainedStats.map(([k, v]) => `<span class="gain">+${v} ${FEUE.STAT_LABELS[k] || k}</span>`);
        ChatMessage.create({
            user: game.user.id, speaker: ChatMessage.getSpeaker({ actor: this }),
            content: `<div class="feue-levelup"><h3>${this.name} reached level ${newLevel}!</h3>${gainList.length ? `<div class="stat-gains">${gainList.join("")}</div>` : "<p>No stats increased.</p>"}<details><summary>Roll Details</summary><table class="feue-gr-table"><tr><th>Stat</th><th>Roll</th><th>GR</th><th>Result</th></tr>${detailRows}</table></details></div>`
        });

        // Grant class skills for new level
        if (ec) {
            const currentNode = this._getCurrentClassNode(ec);
            await this._grantClassSkills(currentNode, { exactLevel: newLevel });
        }

        // Award WEXP at level 4 and every 4 levels
        if (newLevel >= 4 && newLevel % 4 === 0 && ec) {
            const node = this._getCurrentClassNode(ec);
            const profs = Object.entries(node.weaponProficiencies || {}).filter(([, v]) => v);
            const wexpGain = profs.length;
            if (wexpGain > 0) {
                await this.update({ "system.weaponExp": (system.weaponExp || 0) + wexpGain });
                ui.notifications.info(`${this.name} gained ${wexpGain} Weapon EXP!`);
            }
        }
    }

    async _showPromotionDialog(classItem, promotions) {
        const opts = promotions.map(p => `<option value="${p.id}">${p.name} (${p.classType})</option>`).join("");
        new Dialog({
            title: "Promotion Available!",
            content: `<div style="padding:10px;">
                <p>Choose your promotion path:</p>
                <div class="form-group">
                    <select id="feue-promo-choice" style="width:100%;">${opts}</select>
                </div>
            </div>`,
            buttons: {
                promote: {
                    icon: '<i class="fas fa-arrow-up"></i>',
                    label: "Promote",
                    callback: async (html) => {
                        const id = html.find("#feue-promo-choice").val();
                        const chosen = promotions.find(p => p.id === id);
                        if (!chosen) return;

                        const previousNode = this._getCurrentClassNode(classItem);
                        const prevType = previousNode?.classType || "";
                        const newPath = [...(classItem.system.currentPath || []), id];
                        await classItem.update({ "system.currentPath": newPath });
                        await this._applyPromotionBenefits(previousNode, chosen);

                        if (prevType === "Recruit") {
                            // Recruit→Standard: increment level (e.g. 10→11), keep going
                            const currentLevel = this.system.level || 10;
                            const newLevel = currentLevel + 1;
                            await this.update({
                                "system.level": newLevel,
                                "system.totalLevel": (this.system.totalLevel || currentLevel) + 1
                            });
                            ChatMessage.create({
                                user: game.user.id,
                                speaker: ChatMessage.getSpeaker({ actor: this }),
                                content: `<div class="feue-levelup"><h3>${this.name} promoted to ${chosen.name} at level ${newLevel}!</h3></div>`
                            });
                        } else {
                            // Standard→Promoted/Advanced: reset to level 1
                            const prevLevel = this.system.level || 20;
                            await this.update({
                                "system.level": 1,
                                "system.totalLevel": (this.system.totalLevel || prevLevel) + 1
                            });
                            ChatMessage.create({
                                user: game.user.id,
                                speaker: ChatMessage.getSpeaker({ actor: this }),
                                content: `<div class="feue-levelup"><h3>${this.name} promoted to ${chosen.name}!</h3><p>Level reset to 1.</p></div>`
                            });
                        }

                        ui.notifications.info(`${this.name} promoted to ${chosen.name}!`);
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Decide Later"
                }
            },
            default: "promote"
        }).render(true);
    }

    async _applyPromotionBenefits(previousNode, chosenNode) {
        const prevType = previousNode?.classType || "";
        const nextType = chosenNode?.classType || "";
        const promoteToAdvanced = ["Promoted", "Advanced"].includes(nextType);
        const fromBaseClass = ["Recruit", "Standard"].includes(prevType);

        // ── Adjust Level Up Bonus to account for base stat change ──
        const bonusItem = await this._getOrCreateLevelUpBonus();
        const bonusUpdates = {};

        for (const key of FEUE.STAT_KEYS) {
            const prevBase = Number(previousNode?.baseStats?.[key] || 0);
            const nextBase = Number(chosenNode?.baseStats?.[key] || 0);
            const currentBonus = Number(bonusItem.system.bonuses?.attributes?.[key] || 0);

            // Current total stat = prevBase + currentBonus (ignoring equipment etc.)
            const currentTotal = prevBase + currentBonus;

            let targetTotal = currentTotal;

            if (fromBaseClass && !promoteToAdvanced) {
                // Recruit→Standard: floor to new base
                targetTotal = Math.max(currentTotal, nextBase);
            } else if (promoteToAdvanced) {
                // Standard→Promoted/Advanced: add delta between bases
                targetTotal = currentTotal + Math.max(nextBase - prevBase, 0);
            }

            // New bonus = target total - new base
            const newBonus = Math.max(targetTotal - nextBase, 0);
            bonusUpdates[`system.bonuses.attributes.${key}`] = newBonus;
        }

        await bonusItem.update(bonusUpdates);

        // ── Bump current HP to match new max ──
        // (prepareDerivedData will recalculate hp.max, but we need to adjust hp.value)
        const oldHpMax = Number(this.system.attributes?.hp?.max || 0);
        const prevHpBase = Number(previousNode?.baseStats?.hp || 0);
        const nextHpBase = Number(chosenNode?.baseStats?.hp || 0);
        const oldHpBonus = Number(bonusItem.system.bonuses?.attributes?.hp || 0);
        const oldTotal = prevHpBase + oldHpBonus;  // use pre-update bonus for old total
        let newHpTotal = oldTotal;
        if (fromBaseClass && !promoteToAdvanced) newHpTotal = Math.max(oldTotal, nextHpBase);
        else if (promoteToAdvanced) newHpTotal = oldTotal + Math.max(nextHpBase - prevHpBase, 0);
        const hpDiff = newHpTotal - oldTotal;
        if (hpDiff > 0) {
            await this.update({
                "system.attributes.hp.value": (this.system.attributes?.hp?.value || 0) + hpDiff
            });
        }

        // ── Unit types & weapon proficiencies (unchanged) ──
        const updates = {};
        const unitTypes = Object.entries(chosenNode?.unitTypes || {})
            .filter(([, enabled]) => Boolean(enabled))
            .map(([name]) => name);
        updates["system.unitTypes"] = unitTypes;

        const existingRanks = this.system.weaponRanks || {};
        for (const wt of Object.keys(FEUE.WeaponTypes)) {
            if (chosenNode?.weaponProficiencies?.[wt] && !existingRanks[wt]) {
                updates[`system.weaponRanks.${wt}`] = "E";
            }
        }

        await this.update(updates);

        // ── Grant skills from new class node ──
        const fromRecruit = prevType === "Recruit";
        if (fromRecruit) {
            await this._grantClassSkills(chosenNode, { all: true });
        } else {
            await this._grantClassSkills(chosenNode, { upToLevel: 1 });
        }
        await this._removeInnateSkills(previousNode);
    }

    /**
 * Grant class skills from a node to this actor.
 * @param {Object} node - The class/promotion node with classSkills[]
 * @param {Object} options
 * @param {number}  [options.exactLevel]  - Grant skills at exactly this level
 * @param {number}  [options.upToLevel]   - Grant skills at or below this level
 * @param {boolean} [options.all]         - Grant ALL skills regardless of level
 */
    async _grantClassSkills(node, { exactLevel, upToLevel, all } = {}) {
        const classSkills = Array.isArray(node.classSkills) ? node.classSkills : [];

        if (!classSkills.length) return;

        const toGrant = classSkills.filter(cs => {
            if (cs.level === "Innate") return true;
            if (all) return true;
            const lv = Number(cs.level);
            if (exactLevel !== undefined) return lv === exactLevel;
            if (upToLevel !== undefined) return lv <= upToLevel;
            return false;
        });

        if (!toGrant.length) return;

        // Avoid duplicates — check by name
        const existingNames = new Set(
            this.items.filter(i => i.type === "skill").map(i => i.name)
        );

        const newSkills = toGrant
            .filter(cs => !existingNames.has(cs.skillData.name))
            .map(cs => {
                const sys = foundry.utils.deepClone(cs.skillData.system || {});
                sys.grantedByClass = node.name || "";
                return {
                    name: cs.skillData.name,
                    type: "skill",
                    img: cs.skillData.img || "icons/svg/book.svg",
                    system: sys
                };
            });

        if (newSkills.length) {
            await this.createEmbeddedDocuments("Item", newSkills);
            for (const s of newSkills) {
                ui.notifications.info(`${this.name} learned ${s.name}!`);
            }
        }
    }

    /**
     * Remove innate skills that came from a specific class node.
     * @param {Object} node - The class/promotion node
     */
    async _removeInnateSkills(node) {
        const classSkills = Array.isArray(node.classSkills) ? node.classSkills : [];
        const innateNames = new Set(
            classSkills.filter(cs => cs.level === "Innate").map(cs => cs.skillData.name)
        );
        if (!innateNames.size) return;

        const toRemove = this.items
            .filter(i => i.type === "skill" && innateNames.has(i.name) && (!i.system.grantedByClass || i.system.grantedByClass === node.name))
            .map(i => i.id);

        if (toRemove.length) {
            await this.deleteEmbeddedDocuments("Item", toRemove);
            ui.notifications.info(`${this.name} lost innate skills from previous class.`);
        }
    }

    async _grantWeaponArts(weaponType, newRank) {
        const artsForRank = FEUE.WEAPON_RANK_ARTS?.[weaponType]?.[newRank];
        if (!artsForRank || !artsForRank.length) return;

        const existingNames = new Set(this.items.filter(i => i.type === "combatArt").map(i => i.name));
        const newArts = artsForRank
            .filter(art => !existingNames.has(art.name))
            .map(art => ({
                name: art.name,
                type: "combatArt",
                img: "icons/svg/sword.svg",
                system: {
                    might: art.might || 0,
                    hit: art.hit || 0,
                    crit: art.crit || 0,
                    durabilityCost: art.durabilityCost || 0,
                    effect: art.effect || "",
                    weaponRestriction: weaponType
                }
            }));

        if (newArts.length) {
            await this.createEmbeddedDocuments("Item", newArts);
            for (const a of newArts) {
                ui.notifications.info(`${this.name} learned combat art: ${a.name}!`);
            }
        }
    }

    _onUpdate(changed, options, userId) {
        super._onUpdate(changed, options, userId);
        if (game.user.id !== userId) return;

        // Auto-level when EXP reaches 10+
        const newExp = foundry.utils.getProperty(changed, "system.experience");
        if (newExp !== undefined && newExp >= 10) {
            // Count how many level-ups are earned (every 10 EXP = 1 level)
            const levelUps = Math.floor(newExp / 10);
            // EXP always resets to 0 per rulebook (no carrying remainder)
            this.update({ "system.experience": 0 }).then(async () => {
                for (let i = 0; i < levelUps; i++) {
                    await this.levelUp();
                }
            });
        }
    }

    async levelReset() {
        const bonusItem = this.items.find(i => i.type === "miscBonus" && i.getFlag("feue", "isLevelUpBonus"));
        if (bonusItem) {
            const resetBonuses = {};
            for (const k of FEUE.STAT_KEYS) resetBonuses[`system.bonuses.attributes.${k}`] = 0;
            resetBonuses["system.bonuses.attributes.move"] = 0;
            await bonusItem.update(resetBonuses);
        }

        const resetAccumulated = {};
        for (const k of FEUE.STAT_KEYS) resetAccumulated[k] = 0;
        await this.update({
            "system.level": 1,
            "system.totalLevel": 1,
            "system.experience": 0,
            "system.accumulatedGrowthRates": resetAccumulated
        });

        ChatMessage.create({
            user: game.user.id, speaker: ChatMessage.getSpeaker({ actor: this }),
            content: `<div class="feue-level-reset"><h3>${this.name} — Level Reset!</h3><p>Level, Total Level, EXP, and all level-up stat bonuses have been reset.</p></div>`
        });
        ui.notifications.info(`${this.name} has been reset to Level 1.`);
    }

    canUseWeapon(weapon) {
        if (!weapon?.system?.weaponType || !weapon?.system?.rank) return true;
        const r = this.system.weaponRanks?.[weapon.system.weaponType] || "";
        if (!r) return false;
        return FEUE.WEAPON_RANKS[r].order >= FEUE.WEAPON_RANKS[weapon.system.rank].order;
    }

    getDamageStat(weaponType) {
        const a = this.system.attributes || {};
        if (weaponType === "firearm") return { stat: "SPD", value: a.speed?.value || 0 };
        if (FEUE.MAG_WEAPON_TYPES.includes(weaponType)) return { stat: "MAG", value: a.magic?.value || 0 };
        return { stat: "STR", value: a.strength?.value || 0 };
    }
}

// ====================================================================
// 3. ACTOR SHEET
// ====================================================================
class FireEmblemCharacterSheet extends ActorSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["feue", "sheet", "actor", "character"],
            template: "systems/feue/templates/actor/character-sheet.html",
            width: 800, height: 950,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }]
        });
    }

    getData() {
        const data = super.getData();
        data.FEUE = FEUE;
        data.weaponRankOptions = Object.entries(FEUE.WEAPON_RANKS).map(([key, value]) => ({ key, label: value.label }));
        data.classes = this.actor.items.filter(i => i.type === "class");
        data.skills = this.actor.items.filter(i => i.type === "skill");
        data.spells = this.actor.items.filter(i => i.type === "spell");
        data.combatArts = this.actor.items.filter(i => i.type === "combatArt");
        data.miscBonus = this.actor.items.filter(i => i.type === "miscBonus");
        data.weapons = this.actor.items.filter(i => i.type === "weapon");
        data.battalion = this.actor.items.find(i => i.type === "battalion") || null;
        data.items = this.actor.items.filter(i => i.type === "item");
        data.inventory = this._getInventoryUsage();

        // Class info from tree
        data.equippedClass = data.classes.find(c => c.system.equipped);
        if (data.equippedClass) {
            const node = this.actor._getCurrentClassNode(data.equippedClass);
            data.currentClassName = node.name;
            data.currentClassType = node.classType;
        }

        // Split weapon ranks into proficient vs other
        const classNode = data.equippedClass
            ? this.actor._getCurrentClassNode(data.equippedClass)
            : null;
            const classProficiencies = classNode?.weaponProficiencies || {};
            data.proficientWeapons = {};
            data.otherWeapons = {};
            for (const [weapon, rank] of Object.entries(this.actor.system.weaponRanks || {})) {
            if (classProficiencies[weapon]) {
            data.proficientWeapons[weapon] = rank;
            } else {
            data.otherWeapons[weapon] = rank;
            }
        }
        data.hasClassProficiencies = Object.keys(data.proficientWeapons).length > 0;

        // Non-HP attributes for grid
        data.nonHpAttributes = {};
        for (const [key, val] of Object.entries(this.actor.system.attributes || {})) {
            if (key !== "hp") data.nonHpAttributes[key] = val;
        }

        // Stat cap indicators
        data.atCapStats = {};
        for (const [key, val] of Object.entries(this.actor.system.attributes || {})) {
            if (key === "hp") continue;
            data.atCapStats[key] = val.max > 0 && val.value >= val.max;
        }

        // Support ranks
        const cha = this.actor.system.attributes?.charm?.value || 0;
        data.supportLimit = Math.min(1 + Math.floor(cha / 4), 8);
        const supports = this.actor.system.supportRanks || {};
        data.supportEntries = Object.entries(supports).map(([key, val]) => {
            const aff = FEUE.AFFINITY_BONUSES[val.affinity] || null;
            const mult = FEUE.SUPPORT_RANK_MULTIPLIER[val.rank] || 0;
            let bonusText = "—";
            if (aff && mult) {
                bonusText = `+${aff.pVal * mult} ${aff.primary}, +${aff.sVal * mult} ${aff.secondary}`;
            }
            return { key, name: val.name, rank: val.rank, affinity: val.affinity, bonusText };
        });
        data.supportCount = data.supportEntries.length;

        // Ensure Level Up Bonus item exists (migration for pre-existing actors)
        if (!this.actor.items.find(i => i.type === "miscBonus" && i.getFlag("feue", "isLevelUpBonus"))) {
            this.actor._getOrCreateLevelUpBonus();  // fire-and-forget, sheet will re-render
        }

        return data;
    }

    _getInventoryUsage() {
        const used = this.actor.items.filter(i => i.type === "item" || i.type === "weapon").length;
        return { used, max: 5, full: used >= 5 };
    }

    activateListeners(html) {
        super.activateListeners(html);
        if (!this.options.editable) return;

        html.find(".level-up").click(async () => this.actor.levelUp());
        html.find(".level-reset").click(async () => {
            new Dialog({
                title: "Reset Level",
                content: `<p><b>Warning:</b> This will remove ALL stat gains from leveling up and reset ${this.actor.name} to Level 1.</p><p>Are you sure?</p>`,
                buttons: {
                    yes: { icon: '<i class="fas fa-exclamation-triangle"></i>', label: "Reset", callback: () => this.actor.levelReset() },
                    no: { label: "Cancel" }
                },
                default: "no"
            }).render(true);
        });
        html.find(".item-control.item-create").click(async (ev) => this._onItemCreate(ev));
        html.find(".item-control.item-edit").click(ev => {
            const id = $(ev.currentTarget).closest(".item").data("item-id");
            const item = this.actor.items.get(id);
            if (item) item.sheet.render(true);
        });

        html.find(".item-control.item-delete").click(async ev => {
            const id = $(ev.currentTarget).closest(".item").data("item-id");
            const item = this.actor.items.get(id);
            if (!item) return;
            if (item.getFlag("feue", "isLevelUpBonus")) {
                ui.notifications.warn("The Level Up Bonus cannot be deleted.");
                return;
            }
            await item.delete();
        });

        html.find(".item-control.class-equip").click(async ev => {
            const id = $(ev.currentTarget).closest(".item").data("item-id");
            const item = this.actor.items.get(id);
            if (!item) return;

            if (item.system.equipped) {
                // ── Unequip: remove innate skills ──
                const node = this.actor._getCurrentClassNode(item);
                await this.actor._removeInnateSkills(node);
                await item.update({ "system.equipped": false });
                return;
            }

            // Unequip all other classes first
            for (const c of this.actor.items.filter(i => i.type === "class" && i.system.equipped)) {
                const oldNode = this.actor._getCurrentClassNode(c);
                await this.actor._removeInnateSkills(oldNode);
                await c.update({ "system.equipped": false });
            }

            // Equip the new class
            await item.update({ "system.equipped": true });

            // ── Grant skills up to current level ──
            const node = this.actor._getCurrentClassNode(item);
            const currentLevel = this.actor.system.level || 1;
            await this.actor._grantClassSkills(node, { upToLevel: currentLevel });
        });

        html.find(".item-control.weapon-equip").click(async ev => {
            const id = $(ev.currentTarget).closest(".item").data("item-id");
            const item = this.actor.items.get(id);
            if (!item) return;
            if (item.system.equipped) { await item.update({ "system.equipped": false }); return; }
            const others = this.actor.items.filter(i => i.type === "weapon" && i.system.equipped && i.id !== item.id);
            if (others.length) await this.actor.updateEmbeddedDocuments("Item", others.map(w => ({ _id: w.id, "system.equipped": false })));
            await item.update({ "system.equipped": true });
        });

        html.find(".item-control.item-equip").click(async ev => {
            const id = $(ev.currentTarget).closest(".item").data("item-id");
            const item = this.actor.items.get(id);
            if (!item) return;
            if (item.system.equipped) { await item.update({ "system.equipped": false }); return; }
            // Unequip other equippable items first (only one equipped at a time)
            const others = this.actor.items.filter(i => i.type === "item" && i.system.itemType === "equippable" && i.system.equipped && i.id !== item.id);
            if (others.length) await this.actor.updateEmbeddedDocuments("Item", others.map(i => ({ _id: i.id, "system.equipped": false })));
            await item.update({ "system.equipped": true });
        });

        html.find(".roll-attack").click(async (ev) => this._onRollAttack(ev));
        html.find(".roll-battalion").click(async (ev) => this._onRollBattalion(ev));
        html.find(".roll-spell").click(async (ev) => this._onRollSpell(ev));
        html.find(".roll-combat-art").click(async (ev) => this._onRollCombatArt(ev));
        html.find(".item-control.use-item").click(async (ev) => this._onUseItem(ev));
        html.find(".item-control.use-skill").click(async (ev) => this._onUseSkill(ev));

        // Status effects
        html.find(".status-effect-add").click(() => this._onAddStatusEffect());
        html.find(".status-effect-remove").click(ev => this._onRemoveStatusEffect(Number($(ev.currentTarget).data("effect-index"))));
        html.find(".effect-duration-input").change(ev => {
            const idx = Number($(ev.currentTarget).data("effect-index"));
            const val = Number(ev.currentTarget.value);
            const statuses = foundry.utils.deepClone(this.actor.system.statusEffects || []);
            if (statuses[idx]) {
                statuses[idx].duration = val;
                this.actor.update({ "system.statusEffects": statuses });
            }
        });

        // Weapon EXP spending
        html.find(".wexp-spend").click(async (ev) => this._onSpendWexp(ev));

        // Supports
        html.find(".support-add").click(() => this._onAddSupport());
        html.find(".support-remove").click(ev => this._onRemoveSupport($(ev.currentTarget).data("support-key")));
        html.find(".support-rank-select").change(ev => {
            const key = $(ev.currentTarget).data("support-key");
            const rank = ev.currentTarget.value;
            this.actor.update({ [`system.supportRanks.${key}.rank`]: rank });
        });

        html.find(".other-weapons-toggle").click(ev => {
            const toggle = $(ev.currentTarget);
            const content = toggle.next(".other-weapons-content");
            content.slideToggle(200);
            toggle.find("i.fas").toggleClass("fa-caret-right fa-caret-down");
        });

        // Mark the Level Up Bonus item as non-deletable and visually distinct
        const lubId = this.actor.items.find(i =>
            i.type === "miscBonus" && i.getFlag("feue", "isLevelUpBonus")
        )?._id;
        if (lubId) {
            const lubEl = html.find(`.item[data-item-id="${lubId}"]`);
            lubEl.addClass("level-up-bonus-item");
            lubEl.find(".item-delete").remove();
        }
    }

    async _onRollAttack(event) {
        event.preventDefault();
        const weapon = this.actor.items.get(event.currentTarget.dataset.weaponId);
        if (!weapon) return;

        const target = this._getTarget();
        const buildPreview = (tri) => {
            const s = this._computeAttackStats(weapon, tri, target);
            const pen = s.penalties.length ? `<span style="color:red;">${s.penalties.join(", ")}</span> | ` : "";
            const tgt = target ? `<b>vs ${target.name}</b><br/>` : '<i>No target selected</i><br/>';
            return `${tgt}${pen}<b>Hit:</b> ${s.netHit}%${target ? ` (${s.rawHit} - ${s.tAvo})` : ""} | <b>Crit:</b> ${s.netCrit}%${target ? ` (${s.rawCrit} - ${s.tDodge})` : ""} | <b>Dmg:</b> ${s.netDmg}${target ? ` (${s.rawDmg} - ${s.tDef} ${s.defLabel})` : ""}`;
        };

        new Dialog({
            title: `Attack with ${weapon.name}`,
            content: `<form>
                <div class="form-group"><label>Weapon Triangle</label>
                    <select id="wt-triangle">
                        <option value="none">None</option>
                        <option value="advantage">Advantage (+15 Hit, +3 Mt)</option>
                        <option value="disadvantage">Disadvantage (-15 Hit, -3 Mt)</option>
                    </select>
                </div>
                <div id="attack-preview" style="padding:6px; margin-top:6px; background:rgba(0,0,0,0.05); border-radius:4px; font-size:12px;">${buildPreview("none")}</div>
            </form>`,
            buttons: {
                roll: {
                    icon: '<i class="fas fa-dice-d10"></i>', label: "Roll",
                    callback: (h) => {
                        const triangle = h.find("#wt-triangle").val();
                        this._executeAttack(weapon, triangle);
                    }
                },
                cancel: { label: "Cancel" }
            },
            default: "roll",
            render: (h) => {
                h.find("#wt-triangle").change(ev => {
                    h.find("#attack-preview").html(buildPreview(ev.currentTarget.value));
                });
            }
        }).render(true);
    }

    /** Get targeted token's actor, if any. */
    _getTarget() {
        const t = Array.from(game.user.targets)[0];
        return t?.actor || null;
    }

    /** Compute attack stats without rolling. Used for preview and execution. */
    _computeAttackStats(weapon, triangle = "none", target = null) {
        const a = this.actor;
        const isBroken = (weapon.system.uses?.value ?? 1) <= 0;
        const isNonProf = !a.canUseWeapon(weapon);
        const penalties = [];

        let mightMult = 1, hitMult = 1, critOverride = null;
        if (isBroken) { mightMult = 0; hitMult = 0.5; critOverride = 0; penalties.push("BROKEN"); }
        else if (isNonProf) { mightMult = 0.5; hitMult = 0.5; critOverride = 0; penalties.push("NON-PROFICIENT"); }

        let triHit = 0, triMt = 0, triNote = "";
        if (triangle === "advantage") { triHit = 15; triMt = 3; triNote = "WTA +15 Hit, +3 Mt"; }
        else if (triangle === "disadvantage") { triHit = -15; triMt = -3; triNote = "WTD -15 Hit, -3 Mt"; }

        const di = a.getDamageStat(weapon.system.weaponType);
        const baseMight = isBroken ? 0 : Number(weapon.system.might || 0);
        const rawDmg = Math.max(Math.floor((baseMight + di.value) * mightMult) + triMt, 0);
        const rawHit = Math.max(Math.floor((a.system.combat?.hitRate || 0) * hitMult) + triHit, 0);
        const rawCrit = critOverride !== null ? critOverride : (a.system.combat?.critRate || 0);

        // Target defenses
        const isMagic = FEUE.MAG_WEAPON_TYPES.includes(weapon.system.weaponType);
        const tAvo = target?.system?.combat?.avoid || 0;
        const tDodge = target?.system?.combat?.dodge || 0;
        const tDef = target ? (isMagic ? (target.system.attributes?.resistance?.value || 0) : (target.system.attributes?.defense?.value || 0)) : 0;
        const defLabel = isMagic ? "Res" : "Def";

        return {
            rawDmg, rawHit, rawCrit,
            netDmg: Math.max(rawDmg - tDef, 0),
            netHit: Math.max(rawHit - tAvo, 0),
            netCrit: Math.max(rawCrit - tDodge, 0),
            tAvo, tDodge, tDef, defLabel,
            baseMight, di, triHit, triMt, triNote, mightMult, penalties,
            targetName: target?.name || null
        };
    }

    async _executeAttack(weapon, triangle = "none") {
        const a = this.actor;
        const target = this._getTarget();
        const s = this._computeAttackStats(weapon, triangle, target);

        const hR = await new Roll("1d100").evaluate(); const hit = hR.total <= s.netHit;
        let crit = false; if (hit && s.netCrit > 0) { const cR = await new Roll("1d100").evaluate(); crit = cR.total <= s.netCrit; }
        if (weapon.system.uses) {
            const newUses = Math.max(weapon.system.uses.value - 1, 0);
            await weapon.update({ "system.uses.value": newUses });
            if (newUses > 0 && newUses <= 2) ui.notifications.warn(`${weapon.name} has only ${newUses} use(s) remaining!`);
        }
        const fd = crit ? s.netDmg * 3 : s.netDmg;

        const penaltyNote = s.penalties.length ? `<p class="feue-penalty"><b>${s.penalties.join(", ")}</b> — penalties applied</p>` : "";
        const triNoteHtml = s.triNote ? `<p class="feue-triangle"><b>${s.triNote}</b></p>` : "";
        const targetNote = target ? `<p class="feue-target"><b>Target:</b> ${target.name} (${s.tAvo} Avo, ${s.tDodge} Dodge, ${s.tDef} ${s.defLabel})</p>` : "";
        ChatMessage.create({
            user: game.user.id, speaker: ChatMessage.getSpeaker({ actor: a }),
            content: `<div class="feue-attack-roll"><h3>${a.name} attacks ${target ? target.name : ""} with ${weapon.name}!</h3>${penaltyNote}${triNoteHtml}${targetNote}<p><b>Hit:</b> ${hR.total} vs ${s.netHit}%${target ? ` (${s.rawHit} - ${s.tAvo} Avo)` : ""} — <b>${hit ? "HIT" : "MISS"}</b></p>${hit && s.netCrit > 0 ? `<p><b>Crit:</b> ${crit ? "CRITICAL HIT!" : "Normal Hit"}</p>` : ""}${hit ? `<p><b>Damage:</b> ${fd}${target ? ` (${s.rawDmg} - ${s.tDef} ${s.defLabel}${crit ? " × 3" : ""})` : ` (${s.baseMight} Mt + ${s.di.value} ${s.di.stat}${crit ? " × 3" : ""})`}</p>` : ""}<p><b>Range:</b> ${weapon.system.range}</p></div>`
        });
    }

    async _onRollBattalion(event) {
        event.preventDefault();
        const bn = this.actor.items.get(event.currentTarget.dataset.itemId);
        if (!bn) return;
        const a = this.actor, cha = a.system.attributes?.charm?.value || 0;
        const target = this._getTarget();
        const tAvo = target?.system?.combat?.avoid || 0;
        const tDef = target?.system?.attributes?.defense?.value || 0;
        const rawHr = Number(bn.system.hit || 0) + cha;
        const netHr = Math.max(rawHr - tAvo, 0);
        const rawDmg = Number(bn.system.might || 0);
        const netDmg = Math.max(rawDmg - tDef, 0);
        const hR = await new Roll("1d100").evaluate(); const hit = hR.total <= netHr;
        if (bn.system.endurance?.value > 0) await bn.update({ "system.endurance.value": Math.max(bn.system.endurance.value - 1, 0) });
        const targetNote = target ? `<p class="feue-target"><b>Target:</b> ${target.name} (${tAvo} Avo, ${tDef} Def)</p>` : "";
        ChatMessage.create({
            user: game.user.id, speaker: ChatMessage.getSpeaker({ actor: a }),
            content: `<div class="feue-attack-roll"><h3>${a.name} orders ${bn.name}!</h3>${targetNote}<p><b>Hit:</b> ${hR.total} vs ${netHr}% (${bn.system.hit} + ${cha} CHA${target ? ` - ${tAvo} Avo` : ""}) — <b>${hit ? "HIT" : "MISS"}</b></p>${hit ? `<p><b>Damage:</b> ${netDmg}${target ? ` (${rawDmg} - ${tDef} Def)` : ""}</p>` : ""}<p><b>Range:</b> ${bn.system.range}</p></div>`
        });
    }

    async _onRollSpell(event) {
        event.preventDefault();
        const sp = this.actor.items.get(event.currentTarget.dataset.itemId);
        if (!sp) return;
        const a = this.actor;
        const baseCost = Number(sp.system.hpCost || 0);

        // Spell Admix: equipped weapon name matches spell name → +2 Mt, +10 Hit, +5 Crit, -2 HP cost
        const ew = a.items.find(i => i.type === "weapon" && i.system?.equipped);
        const admix = ew && ew.name.toLowerCase() === sp.name.toLowerCase();
        const admixMt = admix ? 2 : 0;
        const admixHit = admix ? 10 : 0;
        const admixCrit = admix ? 5 : 0;
        const cost = admix ? Math.max(baseCost - 2, 1) : baseCost;

        const curHp = a.system.attributes?.hp?.value || 0;
        if (cost > 0 && curHp <= cost) return ui.notifications.warn("Not enough HP.");
        const mag = a.system.attributes?.magic?.value || 0;

        // Healing branch: White Magic heals instead of dealing damage
        const isHealing = sp.system.school === "White Magic";
        if (isHealing) {
            return this._castHealingSpell(sp, a, mag, admixMt, cost, baseCost, admix, ew);
        }

        const target = this._getTarget();
        const rawDmg = Number(sp.system.might || 0) + mag + admixMt;
        const rawHit = (a.system.combat?.baseHitRate || 0) + Number(sp.system.hit || 0) + admixHit;
        const rawCrit = (a.system.combat?.baseCritRate || 0) + Number(sp.system.crit || 0) + admixCrit;

        // Target defenses (spells always use Resistance)
        const tAvo = target?.system?.combat?.avoid || 0;
        const tDodge = target?.system?.combat?.dodge || 0;
        const tRes = target?.system?.attributes?.resistance?.value || 0;

        const netDmg = Math.max(rawDmg - tRes, 0);
        const netHit = Math.max(rawHit - tAvo, 0);
        const netCrit = Math.max(rawCrit - tDodge, 0);

        const hR = await new Roll("1d100").evaluate(); const hit = hR.total <= netHit;
        let crit = false; if (hit && netCrit > 0) { const cR = await new Roll("1d100").evaluate(); crit = cR.total <= netCrit; }
        if (cost > 0) await a.update({ "system.attributes.hp.value": curHp - cost });
        const fd = crit ? netDmg * 3 : netDmg;

        const admixNote = admix ? `<p class="feue-admix"><b>Spell Admix!</b> ${ew.name} equipped — +2 Mt, +10 Hit, +5 Crit, -2 HP cost</p>` : "";
        const targetNote = target ? `<p class="feue-target"><b>Target:</b> ${target.name} (${tAvo} Avo, ${tDodge} Dodge, ${tRes} Res)</p>` : "";
        ChatMessage.create({
            user: game.user.id, speaker: ChatMessage.getSpeaker({ actor: a }),
            content: `<div class="feue-attack-roll"><h3>${a.name} casts ${sp.name}${target ? ` on ${target.name}` : ""}!</h3>${admixNote}${targetNote}<p><b>School:</b> ${sp.system.school} | <b>HP Cost:</b> ${cost}${admix ? ` (base ${baseCost})` : ""}</p><p><b>Hit:</b> ${hR.total} vs ${netHit}%${target ? ` (${rawHit} - ${tAvo} Avo)` : ""}${admix ? ` (incl. +${admixHit} Admix)` : ""} — <b>${hit ? "HIT" : "MISS"}</b></p>${hit && netCrit > 0 ? `<p><b>Crit:</b> ${crit ? "CRITICAL HIT!" : "Normal Hit"}${admix ? ` (incl. +${admixCrit} Admix)` : ""}</p>` : ""}${hit ? `<p><b>Damage:</b> ${fd}${target ? ` (${rawDmg} - ${tRes} Res${crit ? " × 3" : ""})` : ` (${sp.system.might} Mt + ${mag} MAG${admix ? ` + ${admixMt} Admix` : ""}${crit ? " × 3" : ""})`}</p>` : ""}<p><b>Range:</b> ${sp.system.range}</p></div>`
        });
    }

    async _castHealingSpell(sp, caster, mag, admixMt, cost, baseCost, admix, admixWeapon) {
        const healing = Number(sp.system.might || 0) + mag + admixMt;

        // Build target options: Self + tokens on canvas
        const targetOptions = [`<option value="self">Self (${caster.name})</option>`];
        if (typeof canvas !== "undefined" && canvas.tokens?.placeables) {
            for (const token of canvas.tokens.placeables) {
                if (token.actor && token.actor.id !== caster.id) {
                    targetOptions.push(`<option value="${token.actor.id}">${token.actor.name}</option>`);
                }
            }
        }

        new Dialog({
            title: `${sp.name} — Healing`,
            content: `<form>
                <div class="form-group"><label>Target</label><select id="heal-target">${targetOptions.join("")}</select></div>
                <p>Healing: <b>${healing}</b> HP (${sp.system.might} Mt + ${mag} MAG${admixMt ? ` + ${admixMt} Admix` : ""})</p>
                <p>HP Cost: <b>${cost}</b>${admix ? ` (base ${baseCost})` : ""}</p>
            </form>`,
            buttons: {
                cast: {
                    icon: '<i class="fas fa-heart"></i>', label: "Cast",
                    callback: async (h) => {
                        const targetId = h.find("#heal-target").val();
                        const target = targetId === "self" ? caster : game.actors.get(targetId);
                        if (!target) return;

                        const tHp = target.system.attributes?.hp?.value || 0;
                        const tMax = target.system.attributes?.hp?.max || 0;
                        const newHp = Math.min(tHp + healing, tMax);
                        const healed = newHp - tHp;
                        await target.update({ "system.attributes.hp.value": newHp });

                        // Deduct HP cost from caster
                        if (cost > 0) await caster.update({ "system.attributes.hp.value": (caster.system.attributes?.hp?.value || 0) - cost });

                        const admixNote = admix ? `<p class="feue-admix"><b>Spell Admix!</b> ${admixWeapon.name} equipped — +2 Healing, -2 HP cost</p>` : "";
                        ChatMessage.create({
                            user: game.user.id, speaker: ChatMessage.getSpeaker({ actor: caster }),
                            content: `<div class="feue-heal-roll"><h3>${caster.name} casts ${sp.name} on ${target.name}!</h3>${admixNote}<p><b>School:</b> ${sp.system.school} | <b>HP Cost:</b> ${cost}${admix ? ` (base ${baseCost})` : ""}</p><p><b>Healed:</b> ${healed} HP (${tHp} → ${newHp})</p><p><b>Range:</b> ${sp.system.range}</p></div>`
                        });
                    }
                },
                cancel: { label: "Cancel" }
            },
            default: "cast"
        }).render(true);
    }

    async _onRollCombatArt(event) {
        event.preventDefault();
        const art = this.actor.items.get(event.currentTarget.dataset.itemId);
        if (!art) return;
        const weapons = this.actor.items.filter(i => i.type === "weapon");
        if (!weapons.length) return ui.notifications.warn("No weapons available.");
        const restr = art.system.weaponRestriction || "—";
        let valid = weapons;
        if (restr !== "—") { valid = weapons.filter(w => w.system.weaponType === restr.toLowerCase()); if (!valid.length) return ui.notifications.warn(`No ${restr} weapons.`); }
        if (valid.length === 1) return this._executeCombatArt(art, valid[0]);
        const opts = valid.map(w => `<option value="${w.id}">${w.name}</option>`).join("");
        new Dialog({
            title: `${art.name}`, content: `<form><div class="form-group"><label>Weapon</label><select id="ca-wpn">${opts}</select></div></form>`,
            buttons: { use: { label: "Use", callback: (h) => { const w = this.actor.items.get(h.find("#ca-wpn").val()); if (w) this._executeCombatArt(art, w); } }, cancel: { label: "Cancel" } }, default: "use"
        }).render(true);
    }

    async _executeCombatArt(art, weapon) {
        const a = this.actor, dc = Number(art.system.durabilityCost || 0), uses = weapon.system.uses;
        if (uses && dc > 0 && uses.value < dc) return ui.notifications.warn(`Not enough durability on ${weapon.name}.`);

        const target = this._getTarget();
        const di = a.getDamageStat(weapon.system.weaponType);
        const artMt = Number(art.system.might || 0);
        const artHit = Number(art.system.hit || 0);
        const artCrit = Number(art.system.crit || 0);

        const rawDmg = Number(weapon.system.might || 0) + di.value + artMt;
        const rawHit = (a.system.combat?.baseHitRate || 0) + Number(weapon.system.hit || 0) + artHit;
        const rawCrit = (a.system.combat?.baseCritRate || 0) + Number(weapon.system.crit || 0) + artCrit;

        // Target defenses
        const isMagic = FEUE.MAG_WEAPON_TYPES.includes(weapon.system.weaponType);
        const tAvo = target?.system?.combat?.avoid || 0;
        const tDodge = target?.system?.combat?.dodge || 0;
        const tDef = target ? (isMagic ? (target.system.attributes?.resistance?.value || 0) : (target.system.attributes?.defense?.value || 0)) : 0;
        const defLabel = isMagic ? "Res" : "Def";

        const netDmg = Math.max(rawDmg - tDef, 0);
        const netHit = Math.max(rawHit - tAvo, 0);
        const netCrit = Math.max(rawCrit - tDodge, 0);

        const hR = await new Roll("1d100").evaluate(); const hit = hR.total <= netHit;
        let crit = false; if (hit && netCrit > 0) { const cR = await new Roll("1d100").evaluate(); crit = cR.total <= netCrit; }
        if (uses && dc > 0) {
            const newUses = Math.max(uses.value - dc, 0);
            await weapon.update({ "system.uses.value": newUses });
            if (newUses > 0 && newUses <= 2) ui.notifications.warn(`${weapon.name} has only ${newUses} use(s) remaining!`);
        }
        const fd = crit ? netDmg * 3 : netDmg;

        const dmgParts = [`${weapon.system.might} Mt`, `${di.value} ${di.stat}`];
        if (artMt) dmgParts.push(`${artMt > 0 ? "+" : ""}${artMt} Art`);

        const targetNote = target ? `<p class="feue-target"><b>Target:</b> ${target.name} (${tAvo} Avo, ${tDodge} Dodge, ${tDef} ${defLabel})</p>` : "";
        ChatMessage.create({
            user: game.user.id, speaker: ChatMessage.getSpeaker({ actor: a }),
            content: `<div class="feue-attack-roll"><h3>${a.name} uses ${art.name}${target ? ` on ${target.name}` : ""} with ${weapon.name}!</h3>${targetNote}<p><b>Hit:</b> ${hR.total} vs ${netHit}%${target ? ` (${rawHit} - ${tAvo} Avo)` : ""}${artHit ? ` (incl. ${artHit > 0 ? "+" : ""}${artHit} Art)` : ""} — <b>${hit ? "HIT" : "MISS"}</b></p>${hit && netCrit > 0 ? `<p><b>Crit:</b> ${crit ? "CRITICAL HIT!" : "Normal Hit"}${artCrit ? ` (incl. ${artCrit > 0 ? "+" : ""}${artCrit} Art)` : ""}</p>` : ""}${hit ? `<p><b>Damage:</b> ${fd}${target ? ` (${rawDmg} - ${tDef} ${defLabel}${crit ? " × 3" : ""})` : ` (${dmgParts.join(" + ")}${crit ? " × 3" : ""})`}</p>` : ""}<p><b>Effect:</b> ${art.system.effect || "—"} | <b>Dur Cost:</b> ${dc}</p></div>`
        });
    }

    async _onUseSkill(event) {
        event.preventDefault();
        const itemId = $(event.currentTarget).data("item-id");
        const skill = this.actor.items.get(itemId);
        if (!skill || skill.type !== "skill") return;

        ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            content: `<div class="feue-skill-use"><h3>${this.actor.name} activates ${skill.name}!</h3><p><b>Type:</b> ${skill.system.skillType}</p>${skill.system.activation ? `<p><b>Effect:</b> ${skill.system.activation}</p>` : ""}</div>`
        });
    }

    async _onSpendWexp(event) {
        event.preventDefault();
        const weaponType = event.currentTarget.dataset.weaponType;
        const wexp = this.actor.system.weaponExp || 0;
        if (wexp <= 0) return ui.notifications.warn("No Weapon EXP available.");

        const currentRank = this.actor.system.weaponRanks?.[weaponType] || "";
        const rankOrder = ["", "E", "D", "C", "B", "A", "S"];
        const idx = rankOrder.indexOf(currentRank);
        if (idx >= rankOrder.length - 1) return ui.notifications.warn(`${weaponType} is already at max rank (S).`);

        const nextRank = rankOrder[idx + 1];
        await this.actor.update({
            [`system.weaponRanks.${weaponType}`]: nextRank,
            "system.weaponExp": wexp - 1
        });
        ui.notifications.info(`${FEUE.WeaponTypes[weaponType]} rank advanced to ${nextRank}! (1 WEXP spent)`);
        await this.actor._grantWeaponArts(weaponType, nextRank);
    }

    _onAddSupport() {
        const cha = this.actor.system.attributes?.charm?.value || 0;
        const limit = Math.min(1 + Math.floor(cha / 4), 8);
        const current = Object.keys(this.actor.system.supportRanks || {}).length;
        if (current >= limit) return ui.notifications.warn(`Support limit reached (${limit}).`);

        const affOpts = FEUE.AFFINITIES.map(a => `<option value="${a}">${a}</option>`).join("");
        const rankOpts = FEUE.SUPPORT_RANKS.map(r => `<option value="${r}">${r}</option>`).join("");
        new Dialog({
            title: "Add Support Partner",
            content: `<form>
                <div class="form-group"><label>Partner Name</label><input type="text" id="sp-name" placeholder="Character name" /></div>
                <div class="form-group"><label>Partner Affinity</label><select id="sp-aff">${affOpts}</select></div>
                <div class="form-group"><label>Starting Rank</label><select id="sp-rank">${rankOpts}</select></div>
            </form>`,
            buttons: {
                add: {
                    icon: '<i class="fas fa-plus"></i>', label: "Add",
                    callback: async (h) => {
                        const name = h.find("#sp-name").val()?.trim();
                        if (!name) return;
                        const affinity = h.find("#sp-aff").val();
                        const rank = h.find("#sp-rank").val();
                        const key = foundry.utils.randomID();
                        await this.actor.update({ [`system.supportRanks.${key}`]: { name, affinity, rank } });
                    }
                },
                cancel: { label: "Cancel" }
            },
            default: "add"
        }).render(true);
    }

    async _onRemoveSupport(key) {
        await this.actor.update({ [`system.supportRanks.-=${key}`]: null });
    }

    _onAddStatusEffect() {
        const opts = FEUE.STATUS_EFFECTS.map(e => `<option value="${e}">${e}</option>`).join("");
        new Dialog({
            title: "Add Status Effect",
            content: `<form>
                <div class="form-group"><label>Effect</label><select id="se-name">${opts}<option value="__custom">Custom...</option></select></div>
                <div class="form-group" id="se-custom-group" style="display:none;"><label>Custom Name</label><input type="text" id="se-custom" /></div>
                <div class="form-group"><label>Duration (turns, -1 = indefinite)</label><input type="number" id="se-dur" value="3" min="-1" /></div>
            </form>`,
            buttons: {
                add: {
                    icon: '<i class="fas fa-plus"></i>', label: "Add",
                    callback: async (h) => {
                        let name = h.find("#se-name").val();
                        if (name === "__custom") name = h.find("#se-custom").val()?.trim();
                        if (!name) return;
                        const dur = Number(h.find("#se-dur").val()) || 3;
                        const statuses = foundry.utils.deepClone(this.actor.system.statusEffects || []);
                        statuses.push({ name, duration: dur });
                        await this.actor.update({ "system.statusEffects": statuses });
                    }
                },
                cancel: { label: "Cancel" }
            },
            default: "add",
            render: (h) => {
                h.find("#se-name").change(ev => {
                    h.find("#se-custom-group").toggle(ev.currentTarget.value === "__custom");
                });
            }
        }).render(true);
    }

    async _onRemoveStatusEffect(idx) {
        const statuses = foundry.utils.deepClone(this.actor.system.statusEffects || []);
        if (idx >= 0 && idx < statuses.length) {
            statuses.splice(idx, 1);
            await this.actor.update({ "system.statusEffects": statuses });
        }
    }

    async _onUseItem(event) {
        event.preventDefault();
        const itemId = $(event.currentTarget).closest(".item").data("item-id");
        const item = this.actor.items.get(itemId);
        if (!item || item.type !== "item") return;

        const uses = item.system.uses;
        if (uses && uses.value <= 0) {
            return ui.notifications.warn(`${item.name} has no uses remaining.`);
        }

        const a = this.actor;
        const effect = (item.system.effect || "").toLowerCase();
        const name = item.name.toLowerCase();
        const results = [];

        // Full HP restore
        if (/restore\s+all\s+hp|full\s+hp|restore.*max.*hp/.test(effect) || name === "elixir") {
            const maxHp = a.system.attributes.hp.max;
            const curHp = a.system.attributes.hp.value;
            const healed = maxHp - curHp;
            await a.update({ "system.attributes.hp.value": maxHp });
            results.push(`Restored all HP (+${healed})`);
        } else {
            // Partial HP restore
            const hpMatch = effect.match(/(?:restore|heal|\+)\s*(\d+)\s*hp/);
            if (hpMatch || name === "vulnerary") {
                const amount = hpMatch ? Number(hpMatch[1]) : 10;
                const maxHp = a.system.attributes.hp.max;
                const curHp = a.system.attributes.hp.value;
                const newHp = Math.min(curHp + amount, maxHp);
                const healed = newHp - curHp;
                await a.update({ "system.attributes.hp.value": newHp });
                results.push(`Restored ${healed} HP (${curHp} → ${newHp})`);
            }
        }

        // Cure poison
        if (/cure.*poison|remove.*poison/.test(effect) || name === "antitoxin") {
            const statuses = foundry.utils.deepClone(a.system.statusEffects || []);
            const idx = statuses.findIndex(s => (s.name || s).toLowerCase() === "poison");
            if (idx >= 0) {
                statuses.splice(idx, 1);
                await a.update({ "system.statusEffects": statuses });
                results.push("Cured Poison");
            } else {
                results.push("No Poison to cure");
            }
        }

        // Generic effect — display text if no known pattern matched
        if (!results.length && item.system.effect) {
            results.push(item.system.effect);
        }

        // Decrement uses
        if (uses) {
            const newUses = Math.max(uses.value - 1, 0);
            await item.update({ "system.uses.value": newUses });
            if (newUses <= 0) results.push("Item depleted!");
        }

        ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: a }),
            content: `<div class="feue-item-use"><h3>${a.name} uses ${item.name}</h3><p>${results.join("</p><p>")}</p></div>`
        });
    }

    async _onItemCreate(event) {
        event.preventDefault();
        const type = event.currentTarget.dataset.type;
        if (!type) return ui.notifications.error("Missing item type.");
        if ((type === "item" || type === "weapon") && this._getInventoryUsage().full) return ui.notifications.error("Inventory full (5 max).");
        if (type === "battalion" && this.actor.items.some(i => i.type === "battalion")) return ui.notifications.error("Only one battalion allowed.");
        const [created] = await this.actor.createEmbeddedDocuments("Item", [{ name: `New ${type.charAt(0).toUpperCase()}${type.slice(1)}`, type }]);
        if (created) created.sheet.render(true);
    }
}

// ====================================================================
// 4. ITEM CLASS & SHEET
// ====================================================================
class FireEmblemItem extends Item {
    prepareDerivedData() { }
}

class FireEmblemItemSheet extends ItemSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["feue", "sheet", "item"], template: "systems/feue/templates/item/item-sheet.html",
            width: 600, height: 700,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
        });
    }

    getData() {
        const data = super.getData();
        data.FEUE = FEUE;
        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);
        if (!this.options.editable) return;
        html.find("input, select, textarea").change(ev => this._saveField(ev));

        if (this.item.type === "class") {
            this._renderPromotionTree(html);
            html.find(".promo-add-root").click(() => this._addPromotion([]));
            html.on("click", ".promo-add-sub", (ev) => this._addPromotion($(ev.currentTarget).data("path").toString().split(",")));
            html.on("click", ".promo-edit", (ev) => this._editPromotion($(ev.currentTarget).data("path").toString().split(",")));
            html.on("click", ".promo-delete", async (ev) => {
                const ok = await Dialog.confirm({ title: "Delete Promotion", content: "<p>Delete this promotion and all sub-promotions?</p>" });
                if (ok) this._deletePromotion($(ev.currentTarget).data("path").toString().split(","));
            });

            // ── Promotion Tree: drag-and-drop class items ──
            const promoContainer = html.find("#promotion-tree-container")[0];
            if (promoContainer) {
                promoContainer.addEventListener("dragover", (e) => e.preventDefault());
                promoContainer.addEventListener("drop", (e) => this._onDropClassPromotion(e, []));
            }
            html.on("dragover", ".promo-add-sub", (e) => e.preventDefault());
            html.on("drop", ".promo-add-sub", (e) => {
                const parentPath = $(e.currentTarget).data("path").toString().split(",");
                this._onDropClassPromotion(e.originalEvent, parentPath);
            });

            // ── Class Skills: drag-and-drop, level change, removal ──
            const skillList = html.find(".class-skills-list");
            if (skillList.length) {
                skillList[0].addEventListener("dragover", (e) => e.preventDefault());
                skillList[0].addEventListener("drop", this._onDropClassSkill.bind(this));
            }

            html.find(".class-skill-level").change(async (ev) => {
                const idx = Number($(ev.currentTarget).data("skill-index"));
                const classSkills = foundry.utils.deepClone(this.item.system.classSkills || []);
                if (classSkills[idx]) {
                    classSkills[idx].level = ev.currentTarget.value;
                    await this.item.update({ "system.classSkills": classSkills });
                }
            });

            html.find(".class-skill-remove").click(async (ev) => {
                const idx = Number($(ev.currentTarget).data("skill-index"));
                const classSkills = foundry.utils.deepClone(this.item.system.classSkills || []);
                classSkills.splice(idx, 1);
                await this.item.update({ "system.classSkills": classSkills });
            });
        }
    }

    async _saveField(ev) {
        const el = ev.currentTarget;
        if (!el.name) return;
        let value = el.value;
        if (el.dataset.dtype === "Number") { const n = Number(value); value = Number.isFinite(n) ? n : null; }
        else if (el.type === "checkbox") value = el.checked;
        await this.item.update({ [el.name]: value });
    }

    async _updateObject(event, formData) { return await this.object.update(foundry.utils.expandObject(formData)); }

    // ── PROMOTION TREE ──

    _renderPromotionTree(html) {
        const c = html.find("#promotion-tree-container");
        if (!c.length) return;
        const promos = this.item.system.promotions || [];
        const currentPath = this.item.system.currentPath || [];
        c.html(promos.length ? this._buildTreeHTML(promos, [], currentPath) : '<p style="color:#8b4513; font-style:italic;">No promotions defined. Drag class items here or click Add Promotion.</p>');
    }

    _buildTreeHTML(promos, parentPath, currentPath) {
        let html = '<ul class="promo-tree-list">';
        for (const p of promos) {
            const nodePath = [...parentPath, p.id];
            const path = nodePath.join(",");
            const isProm = ["Promoted", "Advanced"].includes(p.classType);
            const checked = nodePath.length === currentPath.length && nodePath.every((id, idx) => id === currentPath[idx]);
            html += `<li class="promo-tree-node${checked ? " is-selected" : ""}">
                <div class="promo-tree-row">
                    <span class="promo-tree-label" style="color:${isProm ? "#8b4513" : "#2c4875"};">
                        <b>${p.name}</b>
                        <span class="promo-tree-type">(${p.classType})</span>
                        ${checked ? '<span class="promo-tree-check"><i class="fas fa-check-circle"></i> Active</span>' : ""}
                    </span>
                    <a class="promo-edit" data-path="${path}" title="Edit" style="cursor:pointer;"><i class="fas fa-edit"></i></a>
                    <a class="promo-delete" data-path="${path}" title="Delete" style="cursor:pointer;color:#a0522d;"><i class="fas fa-trash"></i></a>
                    <a class="promo-add-sub" data-path="${path}" title="Add Sub-Promotion" style="cursor:pointer;color:#2c4875;"><i class="fas fa-plus"></i></a>
                </div>
                ${p.promotions?.length ? this._buildTreeHTML(p.promotions, nodePath, currentPath) : ""}
            </li>`;
        }
        html += "</ul>";
        return html;
    }

    async _addPromotion(parentPath) {
        const newP = {
            id: foundry.utils.randomID(), name: "New Class", classType: parentPath.length ? "Promoted" : "Standard",
            movement: 5, maxLevel: 20, unitTypes: {}, weaponProficiencies: {}, baseStats: {}, growthRates: {}, statCaps: {}, classSkills: [], promotions: []
        };
        this._openPromotionDialog(newP, async (data) => {
            const promos = foundry.utils.deepClone(this.item.system.promotions || []);
            if (!parentPath.length) { promos.push(data); }
            else {
                let nodes = promos, parent = null;
                for (const id of parentPath) { parent = nodes.find(n => n.id === id); if (!parent) return; parent.promotions ??= []; nodes = parent.promotions; }
                if (parent) parent.promotions.push(data);
            }
            await this.item.update({ "system.promotions": promos });
        });
    }

    async _editPromotion(path) {
        const promos = foundry.utils.deepClone(this.item.system.promotions || []);
        let nodes = promos, node = null, parentNodes = null, nodeIdx = -1;
        for (let i = 0; i < path.length; i++) {
            const idx = nodes.findIndex(n => n.id === path[i]);
            if (idx === -1) return;
            if (i === path.length - 1) { parentNodes = nodes; nodeIdx = idx; node = nodes[idx]; }
            else { nodes[idx].promotions ??= []; nodes = nodes[idx].promotions; }
        }
        if (!node) return;
        this._openPromotionDialog(node, async (data) => {
            data.promotions = node.promotions; data.id = node.id;
            parentNodes[nodeIdx] = data;
            await this.item.update({ "system.promotions": promos });
        });
    }

    async _deletePromotion(path) {
        const promos = foundry.utils.deepClone(this.item.system.promotions || []);
        let nodes = promos;
        for (let i = 0; i < path.length - 1; i++) { const n = nodes.find(x => x.id === path[i]); if (!n) return; n.promotions ??= []; nodes = n.promotions; }
        const idx = nodes.findIndex(n => n.id === path[path.length - 1]);
        if (idx !== -1) nodes.splice(idx, 1);
        await this.item.update({ "system.promotions": promos });
    }

    async _onDropClassPromotion(event, parentPath) {
        event.preventDefault();
        event.stopPropagation();
        let data;
        try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { return; }
        if (data.type !== "Item") return;
        const item = await Item.implementation.fromDropData(data);
        if (!item || item.type !== "class") {
            ui.notifications.warn("Only class items can be dropped onto the promotion tree.");
            return;
        }
        const newP = {
            id: foundry.utils.randomID(),
            name: item.name,
            classType: item.system.classType || "Promoted",
            maxLevel: item.system.maxLevel || 20,
            movement: item.system.movement || 5,
            unitTypes: foundry.utils.deepClone(item.system.unitTypes || {}),
            weaponProficiencies: foundry.utils.deepClone(item.system.weaponProficiencies || {}),
            baseStats: foundry.utils.deepClone(item.system.baseStats || {}),
            growthRates: foundry.utils.deepClone(item.system.growthRates || {}),
            statCaps: foundry.utils.deepClone(item.system.statCaps || {}),
            classSkills: foundry.utils.deepClone(item.system.classSkills || []),
            promotions: []
        };
        const promos = foundry.utils.deepClone(this.item.system.promotions || []);
        if (!parentPath.length) {
            promos.push(newP);
        } else {
            let nodes = promos, parent = null;
            for (const id of parentPath) { parent = nodes.find(n => n.id === id); if (!parent) return; parent.promotions ??= []; nodes = parent.promotions; }
            if (parent) parent.promotions.push(newP);
        }
        await this.item.update({ "system.promotions": promos });
        ui.notifications.info(`Added "${item.name}" as a promotion.`);
    }

    _openPromotionDialog(promo, onSave) {
        const isProm = ["Promoted", "Advanced"].includes(promo.classType);
        const bs = promo.baseStats || {}, gr = promo.growthRates || {}, sc = promo.statCaps || {};
        const sr = (pfx, obj) => FEUE.STAT_KEYS.map(k => `<div style="display:inline-block;width:18%;margin:2px;"><label style="font-size:11px;">${FEUE.STAT_LABELS[k]}</label><input type="number" data-key="${pfx}.${k}" value="${obj[k] || 0}" style="width:100%;"/></div>`).join("");
        const unitTypes = promo.unitTypes || {};
        const weaponProficiencies = promo.weaponProficiencies || {};
        const unitTypeChecks = FEUE.UNIT_TYPES.map(type => `<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;"><input type="checkbox" data-key="ut.${type}" ${unitTypes[type] ? "checked" : ""}/> ${type}</label>`).join("");
        const weaponChecks = Object.entries(FEUE.WeaponTypes).map(([key, label]) => `<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;"><input type="checkbox" data-key="wp.${key}" ${weaponProficiencies[key] ? "checked" : ""}/> ${label}</label>`).join("");
        let promoSkills = foundry.utils.deepClone(promo.classSkills || []);

        const buildSkillListHTML = (skills) => {
            if (!skills.length) return '<p class="promo-skills-empty" style="color:#888; font-style:italic; font-size:11px; margin:4px 0;">Drag skill items here</p>';
            return skills.map((cs, idx) => `
                <div class="promo-skill-entry" style="display:flex; align-items:center; gap:6px; padding:3px 0; border-bottom:1px solid rgba(0,0,0,0.1);">
                    <img src="${cs.skillData.img || 'icons/svg/book.svg'}" width="20" height="20" style="border:1px solid #999; border-radius:2px;" />
                    <span style="flex:1; font-size:12px;">${cs.skillData.name}</span>
                    <select class="promo-skill-level" data-skill-idx="${idx}" style="width:70px; font-size:11px;">
                        <option value="Innate" ${cs.level === "Innate" ? "selected" : ""}>Innate</option>
                        <option value="1" ${cs.level === "1" ? "selected" : ""}>1</option>
                        <option value="5" ${cs.level === "5" ? "selected" : ""}>5</option>
                        <option value="10" ${cs.level === "10" ? "selected" : ""}>10</option>
                        <option value="15" ${cs.level === "15" ? "selected" : ""}>15</option>
                        <option value="20" ${cs.level === "20" ? "selected" : ""}>20</option>
                        <option value="30" ${cs.level === "30" ? "selected" : ""}>30</option>
                    </select>
                    <a class="promo-skill-remove" data-skill-idx="${idx}" style="cursor:pointer; color:#a0522d;" title="Remove"><i class="fas fa-times"></i></a>
                </div>
            `).join("");
        };

        new Dialog({
            title: `Edit: ${promo.name}`,
            content: `<form style="padding:8px;">
                <div class="form-group"><label>Name</label><input type="text" id="pn" value="${promo.name}"/></div>
                <div class="form-group"><label>Class Type</label><select id="pct">${FEUE.CLASS_TYPES.filter(t => ["Standard", "Promoted"].includes(t)).map(t => `<option value="${t}" ${promo.classType === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
                <div style="display:flex;gap:8px;"><div class="form-group" style="flex:1;"><label>Max Level</label><input type="number" id="pml" value="${promo.maxLevel || 20}"/></div><div class="form-group" style="flex:1;"><label>Movement</label><input type="number" id="pmv" value="${promo.movement || 5}"/></div></div>
                <hr/><h4>Unit Types</h4><div>${unitTypeChecks}</div>
                <hr/><h4>Weapon Proficiencies</h4><div>${weaponChecks}</div>
                <hr/><div id="pbs"><h4>${isProm ? "Base Stats (Promotion Targets)" : "Base Stats"}</h4><div>${sr("bs", bs)}</div><hr/></div>
                <h4>Growth Rates</h4><div>${sr("gr", gr)}</div><hr/>
                <h4>Stat Caps</h4><div>${sr("sc", sc)}</div>
                <hr/><h4>Class Skills</h4>
                <div class="promo-skills-drop" style="min-height:40px; border:1px dashed #b8a080; padding:6px; border-radius:4px; background:rgba(139,115,85,0.05);">
                    <div class="promo-skills-list">${buildSkillListHTML(promoSkills)}</div>
                </div>
                </form>`,
            buttons: {
                save: {
                    icon: '<i class="fas fa-save"></i>', label: "Save", callback: (h) => {
                        const d = {
                            id: promo.id, name: h.find("#pn").val() || "Unnamed", classType: h.find("#pct").val(), maxLevel: Number(h.find("#pml").val()) || 20, movement: Number(h.find("#pmv").val()) || 5,
                            unitTypes: {}, weaponProficiencies: {}, baseStats: {}, growthRates: {}, statCaps: {}, classSkills: promoSkills, promotions: promo.promotions || []
                        };
                        h.find("input[type='number'][data-key]").each((_, el) => { const [g, s] = el.dataset.key.split("."); const map = { bs: "baseStats", gr: "growthRates", sc: "statCaps" }; d[map[g]][s] = Number(el.value) || 0; });
                        h.find("input[type='checkbox'][data-key^='ut.']").each((_, el) => { const key = el.dataset.key.slice(3); d.unitTypes[key] = el.checked; });
                        h.find("input[type='checkbox'][data-key^='wp.']").each((_, el) => { const key = el.dataset.key.slice(3); d.weaponProficiencies[key] = el.checked; });
                        onSave(d);
                    }
                }, cancel: { label: "Cancel" }
            }, default: "save",
            render: (h) => {
                // ── Existing: Class type change toggles base stats visibility ──
                h.find("#pct").change(ev => {
                    const v = ev.currentTarget.value;
                    const isProm = ["Promoted", "Advanced"].includes(v);
                    h.find("#pbs h4").text(isProm ? "Base Stats (Promotion Targets)" : "Base Stats");
                });

                // ── Skills: drop zone ──
                const dropZone = h.find(".promo-skills-drop")[0];
                if (dropZone) {
                    dropZone.addEventListener("dragover", (e) => e.preventDefault());
                    dropZone.addEventListener("drop", async (e) => {
                        e.preventDefault();
                        let data;
                        try { data = JSON.parse(e.dataTransfer.getData("text/plain")); } catch { return; }
                        if (data.type !== "Item") return;
                        const item = await Item.implementation.fromDropData(data);
                        if (!item || item.type !== "skill") {
                            ui.notifications.warn("Only skill items can be dropped here.");
                            return;
                        }
                        if (promoSkills.some(cs => cs.skillData.name === item.name)) {
                            ui.notifications.warn(`${item.name} is already listed.`);
                            return;
                        }
                        promoSkills.push({
                            id: foundry.utils.randomID(),
                            level: item.system.level || "1",
                            skillData: {
                                name: item.name,
                                img: item.img,
                                system: foundry.utils.deepClone(item.system)
                            }
                        });
                        h.find(".promo-skills-list").html(buildSkillListHTML(promoSkills));
                        bindSkillListEvents(h);
                    });
                }

                // ── Skills: level change & remove ──
                const bindSkillListEvents = (html) => {
                    html.find(".promo-skill-level").off("change").on("change", (ev) => {
                        const idx = Number($(ev.currentTarget).data("skill-idx"));
                        if (promoSkills[idx]) promoSkills[idx].level = ev.currentTarget.value;
                    });
                    html.find(".promo-skill-remove").off("click").on("click", (ev) => {
                        const idx = Number($(ev.currentTarget).data("skill-idx"));
                        promoSkills.splice(idx, 1);
                        html.find(".promo-skills-list").html(buildSkillListHTML(promoSkills));
                        bindSkillListEvents(html);
                    });
                };
                bindSkillListEvents(html);
            },
        }, { width: 500 }).render(true);
    }

    async _onDropClassSkill(event) {
        event.preventDefault();
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData("text/plain"));
        } catch { return; }

        if (data.type !== "Item") return;

        const item = await Item.implementation.fromDropData(data);
        if (!item || item.type !== "skill") {
            ui.notifications.warn("Only skill items can be dropped here.");
            return;
        }

        const classSkills = foundry.utils.deepClone(this.item.system.classSkills || []);

        // Check for duplicate by name
        if (classSkills.some(cs => cs.skillData.name === item.name)) {
            ui.notifications.warn(`${item.name} is already on this class.`);
            return;
        }

        classSkills.push({
            id: foundry.utils.randomID(),
            level: item.system.level || "1",   // Pre-fill from skill's own level field
            skillData: {
                name: item.name,
                img: item.img,
                system: foundry.utils.deepClone(item.system)
            }
        });

        await this.item.update({ "system.classSkills": classSkills });
    }
}

// ====================================================================
// 5. HOOKS
// ====================================================================
Hooks.once("init", () => {
    console.log("FEUE | Initializing system");
    Handlebars.registerHelper("math", function (l, o, r) { l = parseFloat(l); r = parseFloat(r); return { "+": l + r, "-": l - r, "*": l * r, "/": l / r, "%": l % r }[o]; });
    Handlebars.registerHelper("ifEquals", function (a, b, opts) { return a == b ? opts.fn(this) : opts.inverse(this); });
    Handlebars.registerHelper("join", function (arr, sep) { return Array.isArray(arr) ? arr.join(sep || ", ") : ""; });
    Handlebars.registerHelper("eq", function (a, b) { return a === b; });
    Handlebars.registerHelper("checked", function (v) { return v ? "checked" : ""; });
    Handlebars.registerHelper("lookup", function (obj, key) { return obj?.[key]; });

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("feue", FireEmblemCharacterSheet, { types: ["character"], makeDefault: true });
    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("feue", FireEmblemItemSheet, { makeDefault: true });
    CONFIG.Actor.documentClass = FireEmblemActor;
    CONFIG.Item.documentClass = FireEmblemItem;
});

Hooks.once("ready", () => { console.log("FEUE | System Ready"); });

// Status Effect Auto-Decrement on Combat Turn
Hooks.on("updateCombat", async (combat, changed) => {
    if (!game.user.isGM) return;
    if (!("turn" in changed) && !("round" in changed)) return;

    // Get the combatant whose turn just ended (previous combatant)
    const prevIdx = (combat.turn ?? 0) - 1;
    const combatants = combat.turns;
    if (!combatants?.length) return;
    const prevCombatant = prevIdx >= 0 ? combatants[prevIdx] : combatants[combatants.length - 1];
    const actor = prevCombatant?.actor;
    if (!actor) return;

    const statuses = foundry.utils.deepClone(actor.system.statusEffects || []);
    if (!statuses.length) return;

    const removed = [];
    const remaining = [];
    for (const effect of statuses) {
        if (effect.duration === -1) { remaining.push(effect); continue; } // indefinite
        effect.duration -= 1;
        if (effect.duration <= 0) { removed.push(effect.name); }
        else { remaining.push(effect); }
    }

    if (removed.length || statuses.length !== remaining.length) {
        await actor.update({ "system.statusEffects": remaining });
        if (removed.length) {
            ChatMessage.create({
                user: game.user.id,
                speaker: ChatMessage.getSpeaker({ actor }),
                content: `<div class="feue-status-update"><p><b>${actor.name}</b>: ${removed.join(", ")} wore off.</p></div>`
            });
        }
    }
});

Hooks.on("preCreateItem", (item, createData) => {
    const p = item.parent;
    if (!p || p.documentName !== "Actor") return true;
    const t = createData.type ?? item.type;
    if ((t === "item" || t === "weapon") && p.items.filter(i => i.type === "item" || i.type === "weapon").length >= 5) { ui.notifications.error("Inventory full (5 max)."); return false; }
    if (t === "battalion" && p.items.some(i => i.type === "battalion")) { ui.notifications.error("Only one battalion."); return false; }
    return true;
});