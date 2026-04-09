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
    UNIT_TYPES: ["Infantry", "Mounted", "Flying", "Dragon", "Armored", "Magician", "Beast", "Monster"],
    CLASS_TYPES: ["Recruit", "Standard", "Promoted", "Advanced", "Enemy Only"],
    MAG_WEAPON_TYPES: ["anima", "light", "dark", "staff", "stone"],
    STAT_KEYS: ["hp", "strength", "magic", "skill", "speed", "defense", "resistance", "luck", "charm", "build"],
    STAT_LABELS: { hp: "HP", strength: "Str", magic: "Mag", skill: "Skl", speed: "Spd", defense: "Def", resistance: "Res", luck: "Lck", charm: "Cha", build: "Bld" },
    WeaponTypes: {
        "sword": "Sword", "lance": "Lance", "axe": "Axe", "bow": "Bow",
        "firearm": "Firearm", "unarmed": "Unarmed", "knife": "Knife",
        "anima": "Anima", "light": "Light", "dark": "Dark",
        "staff": "Staff", "monster": "Monster", "stone": "Stone"
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

    _collectBonuses() {
        const totals = this._blankBonuses();
        const bonusItems = this.items.filter(i => ["item", "skill", "miscBonus"].includes(i.type));
        const equippedWeapon = this.items.find(i => i.type === "weapon" && i.system?.equipped);
        if (equippedWeapon) bonusItems.push(equippedWeapon);
        for (const item of bonusItems) {
            const b = item.system?.bonuses || {};
            for (const k of Object.keys(totals.attributes)) totals.attributes[k] += Number(b.attributes?.[k] || 0);
            for (const k of Object.keys(totals.maximums)) totals.maximums[k] += Number(b.maximums?.[k] || 0);
            for (const k of Object.keys(totals.growthRates)) totals.growthRates[k] += Number(b.growthRates?.[k] || 0);
            for (const k of Object.keys(totals.combat)) totals.combat[k] += Number(b.combat?.[k] || 0);
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

        system.movement ??= { base: 0, current: 0 };
        system.movement.base = classMovement + (bonus.attributes.move || 0);
        system.movement.current = classMovement + (bonus.attributes.move || 0);

        // Combat stats
        const ew = this.items.find(i => i.type === "weapon" && i.system?.equipped);
        const wHit = Number(ew?.system?.hit || 0), wCrit = Number(ew?.system?.crit || 0), wWeight = Number(ew?.system?.weight || 0);
        const bld = Number(system.attributes.build?.value || 0);
        const spd = Number(system.attributes.speed?.value || 0);
        const skl = Number(system.attributes.skill?.value || 0);
        const lck = Number(system.attributes.luck?.value || 0);
        const as = spd - Math.max(wWeight - bld, 0) + (bonus.combat.attackSpeed || 0);

        system.combat = {
            attackSpeed: as,
            hitRate: skl + Math.floor(lck / 4) + wHit + (bonus.combat.hitRate || 0),
            critRate: Math.floor(skl / 2) + wCrit + (bonus.combat.critRate || 0),
            avoid: spd + Math.floor(lck / 4) + (bonus.combat.avoid || 0),
            dodge: lck + (bonus.combat.dodge || 0)
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
        const gains = {};

        for (const [stat, growth] of Object.entries(gr)) {
            const roll = await new Roll("1d10").evaluate();
            gains[stat] = (roll.total <= growth) ? 1 : 0;
        }

        // Enforce stat caps — skip gains for stats already at max
        for (const [stat, gained] of Object.entries(gains)) {
            if (!gained) continue;
            if (stat === "hp") {
                // HP cap isn't tracked the same way; skip cap check for HP
                // (or check against a class-defined HP cap if you add one later)
                continue;
            }
            const currentVal = Number(this.system.attributes?.[stat]?.value || 0);
            const cap = Number(this.system.attributes?.[stat]?.max || 0);
            if (cap > 0 && currentVal >= cap) {
                gains[stat] = 0;  // Already at cap
            }
        }

        const gainedStats = Object.entries(gains).filter(([, v]) => v > 0);

        if (gainedStats.length) {
            const bonusItem = await this._getOrCreateLevelUpBonus();
            const updates = {};
            for (const [stat] of gainedStats) {
                const current = Number(bonusItem.system.bonuses?.attributes?.[stat] || 0);
                updates[`system.bonuses.attributes.${stat}`] = current + 1;
            }
            await bonusItem.update(updates);

            if (gains.hp) {
                await this.update({
                    "system.attributes.hp.value": (system.attributes?.hp?.value || 0) + 1
                });
            }
        }

        const newLevel = currentLevel + 1;
        await this.update({ "system.level": newLevel, "system.totalLevel": (system.totalLevel || 1) + 1 });

        const gainList = Object.entries(gains).filter(([, v]) => v > 0).map(([k]) => FEUE.STAT_LABELS[k] || k);
        ChatMessage.create({
            user: game.user.id, speaker: ChatMessage.getSpeaker({ actor: this }),
            content: `<div class="feue-levelup"><h3>${this.name} reached level ${newLevel}!</h3>${gainList.length ? `<div class="stat-gains">${gainList.map(s => `<span class="gain">+1 ${s}</span>`).join("")}</div>` : "<p>No stats increased.</p>"}</div>`
        });

        // Grant class skills for new level
        if (ec) {
            const currentNode = this._getCurrentClassNode(ec);
            await this._grantClassSkills(currentNode, { exactLevel: newLevel });
        }
    }

    //async _checkPromotion(newLevel) {
    //    const ec = this.items.find(i => i.type === "class" && i.system?.equipped);
    //    if (!ec) return;
    //    const node = this._getCurrentClassNode(ec);
    //    const promos = node.promotions || [];
    //    if (promos.length && newLevel >= Number(node.maxLevel || 20)) {
    //        await this._showPromotionDialog(ec, promos);
    //    }
    //}

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
            .map(cs => ({
                name: cs.skillData.name,
                type: "skill",
                img: cs.skillData.img || "icons/svg/book.svg",
                system: foundry.utils.deepClone(cs.skillData.system || {})
            }));

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
            .filter(i => i.type === "skill" && innateNames.has(i.name))
            .map(i => i.id);

        if (toRemove.length) {
            await this.deleteEmbeddedDocuments("Item", toRemove);
            ui.notifications.info(`${this.name} lost innate skills from previous class.`);
        }
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

        html.find(".roll-attack").click(async (ev) => this._onRollAttack(ev));
        html.find(".roll-battalion").click(async (ev) => this._onRollBattalion(ev));
        html.find(".roll-spell").click(async (ev) => this._onRollSpell(ev));
        html.find(".roll-combat-art").click(async (ev) => this._onRollCombatArt(ev));

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
        if (!this.actor.canUseWeapon(weapon)) return ui.notifications.warn("Insufficient weapon rank.");
        if (weapon.system.uses?.value <= 0) return ui.notifications.warn("Weapon is broken.");
        const a = this.actor, di = a.getDamageStat(weapon.system.weaponType), dmg = Number(weapon.system.might || 0) + di.value;
        const hr = a.system.combat?.hitRate || 0, cr = a.system.combat?.critRate || 0;
        const hR = await new Roll("1d100").evaluate(); const hit = hR.total <= hr;
        let crit = false; if (hit && cr > 0) { const cR = await new Roll("1d100").evaluate(); crit = cR.total <= cr; }
        if (weapon.system.uses) await weapon.update({ "system.uses.value": Math.max(weapon.system.uses.value - 1, 0) });
        const fd = crit ? dmg * 3 : dmg;
        ChatMessage.create({
            user: game.user.id, speaker: ChatMessage.getSpeaker({ actor: a }),
            content: `<div class="feue-attack-roll"><h3>${a.name} attacks with ${weapon.name}!</h3><p><b>Hit:</b> ${hR.total} vs ${hr}% — <b>${hit ? "HIT" : "MISS"}</b></p>${hit && cr > 0 ? `<p><b>Crit:</b> ${crit ? "CRITICAL HIT!" : "Normal Hit"}</p>` : ""}${hit ? `<p><b>Damage:</b> ${fd} (${weapon.system.might} Mt + ${di.value} ${di.stat}${crit ? " × 3" : ""})</p>` : ""}<p><b>Range:</b> ${weapon.system.range}</p></div>`
        });
    }

    async _onRollBattalion(event) {
        event.preventDefault();
        const bn = this.actor.items.get(event.currentTarget.dataset.itemId);
        if (!bn) return;
        const a = this.actor, cha = a.system.attributes?.charm?.value || 0, hr = Number(bn.system.hit || 0) + cha;
        const hR = await new Roll("1d100").evaluate(); const hit = hR.total <= hr;
        if (bn.system.endurance?.value > 0) await bn.update({ "system.endurance.value": Math.max(bn.system.endurance.value - 1, 0) });
        ChatMessage.create({
            user: game.user.id, speaker: ChatMessage.getSpeaker({ actor: a }),
            content: `<div class="feue-attack-roll"><h3>${a.name} orders ${bn.name}!</h3><p><b>Hit:</b> ${hR.total} vs ${hr}% (${bn.system.hit} + ${cha} CHA) — <b>${hit ? "HIT" : "MISS"}</b></p>${hit ? `<p><b>Damage:</b> ${bn.system.might}</p>` : ""}<p><b>Range:</b> ${bn.system.range}</p></div>`
        });
    }

    async _onRollSpell(event) {
        event.preventDefault();
        const sp = this.actor.items.get(event.currentTarget.dataset.itemId);
        if (!sp) return;
        const a = this.actor, cost = Number(sp.system.hpCost || 0), curHp = a.system.attributes?.hp?.value || 0;
        if (cost > 0 && curHp <= cost) return ui.notifications.warn("Not enough HP.");
        const mag = a.system.attributes?.magic?.value || 0, dmg = Number(sp.system.might || 0) + mag;
        const hr = a.system.combat?.hitRate || 0, cr = a.system.combat?.critRate || 0;
        const hR = await new Roll("1d100").evaluate(); const hit = hR.total <= hr;
        let crit = false; if (hit && cr > 0) { const cR = await new Roll("1d100").evaluate(); crit = cR.total <= cr; }
        if (cost > 0) await a.update({ "system.attributes.hp.value": curHp - cost });
        const fd = crit ? dmg * 3 : dmg;
        ChatMessage.create({
            user: game.user.id, speaker: ChatMessage.getSpeaker({ actor: a }),
            content: `<div class="feue-attack-roll"><h3>${a.name} casts ${sp.name}!</h3><p><b>School:</b> ${sp.system.school} | <b>HP Cost:</b> ${cost}</p><p><b>Hit:</b> ${hR.total} vs ${hr}% — <b>${hit ? "HIT" : "MISS"}</b></p>${hit && cr > 0 ? `<p><b>Crit:</b> ${crit ? "CRITICAL HIT!" : "Normal Hit"}</p>` : ""}${hit ? `<p><b>Damage:</b> ${fd} (${sp.system.might} Mt + ${mag} MAG${crit ? " × 3" : ""})</p>` : ""}<p><b>Range:</b> ${sp.system.range}</p></div>`
        });
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
        const di = a.getDamageStat(weapon.system.weaponType), dmg = Number(weapon.system.might || 0) + di.value;
        const hr = a.system.combat?.hitRate || 0, cr = a.system.combat?.critRate || 0;
        const hR = await new Roll("1d100").evaluate(); const hit = hR.total <= hr;
        let crit = false; if (hit && cr > 0) { const cR = await new Roll("1d100").evaluate(); crit = cR.total <= cr; }
        if (uses && dc > 0) await weapon.update({ "system.uses.value": Math.max(uses.value - dc, 0) });
        const fd = crit ? dmg * 3 : dmg;
        ChatMessage.create({
            user: game.user.id, speaker: ChatMessage.getSpeaker({ actor: a }),
            content: `<div class="feue-attack-roll"><h3>${a.name} uses ${art.name} with ${weapon.name}!</h3><p><b>Hit:</b> ${hR.total} vs ${hr}% — <b>${hit ? "HIT" : "MISS"}</b></p>${hit && cr > 0 ? `<p><b>Crit:</b> ${crit ? "CRITICAL HIT!" : "Normal Hit"}</p>` : ""}${hit ? `<p><b>Damage:</b> ${fd} (${weapon.system.might} Mt + ${di.value} ${di.stat}${crit ? " × 3" : ""})</p>` : ""}<p><b>Effect:</b> ${art.system.effect || "—"} | <b>Dur Cost:</b> ${dc}</p></div>`
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
        if (data.item.type === "class") {
            const ct = (data.item.system.classType || "").toLowerCase();
        }
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
        c.html(promos.length ? this._buildTreeHTML(promos, [], currentPath) : '<p style="color:#8b4513; font-style:italic;">No promotions defined.</p>');
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

Hooks.on("preCreateItem", (item, createData) => {
    const p = item.parent;
    if (!p || p.documentName !== "Actor") return true;
    const t = createData.type ?? item.type;
    if ((t === "item" || t === "weapon") && p.items.filter(i => i.type === "item" || i.type === "weapon").length >= 5) { ui.notifications.error("Inventory full (5 max)."); return false; }
    if (t === "battalion" && p.items.some(i => i.type === "battalion")) { ui.notifications.error("Only one battalion."); return false; }
    return true;
});