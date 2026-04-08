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
    WeaponTypes: {
        "sword": "Sword",
        "lance": "Lance",
        "axe": "Axe",
        "bow": "Bow",
        "firearm": "Firearm",
        "unarmed": "Unarmed",
        "knife": "Knife",
        "anima": "Anima",
        "light": "Light",
        "dark": "Dark",
        "staff": "Staff",
        "monster": "Monster",
        "stone": "Stone"
    }
};

// Default weapon ranks for safety
const DEFAULT_WEAPON_RANKS = Object.fromEntries(
    Object.keys(FEUE.WeaponTypes).map(type => [type, ""])
);

// ====================================================================
// 2. ACTOR CLASS
// ====================================================================
class FireEmblemActor extends Actor {
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
        const bonusItems = this.items.filter(i => i.type === "skill" || i.type === "item");
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

    prepareDerivedData() {
        const system = this.system;

        // Equipped classes
        const eq = this.items.filter(i => i.type === "class" && i.system?.equipped);
        system.activeClasses = eq.map(c => c.name);

        // Resolve class sources
        let baseStats = {};
        let growths = {};
        let caps = {};

        if (eq.length) {
            const special = eq.find(c => ["Advanced", "Enemy Only"].includes(c.system.classType));
            if (special) {
                baseStats = foundry.utils.deepClone(special.system.baseStats || {});
                growths = foundry.utils.deepClone(special.system.growthRates || {});
                caps = foundry.utils.deepClone(special.system.statCaps || {});
            } else {
                const recruit = eq.find(c => c.system.classType === "Recruit");
                const standard = eq.find(c => c.system.classType === "Standard");
                const promoted = eq.find(c => c.system.classType === "Promoted");

                baseStats = foundry.utils.deepClone((recruit?.system.baseStats) || (recruit?.system.baseAttributes) || (standard?.system.baseStats) || (standard?.system.baseAttributes) || {});
                growths = foundry.utils.deepClone((recruit?.system.growthRates) || (standard?.system.growthRates) || {});
                caps = foundry.utils.deepClone((promoted?.system.statCaps) || (standard?.system.statCaps) || (recruit?.system.statCaps) || {});
            }
        }

        // Overwrite actor stats: value from baseStats, max from caps (fallback to existing/max or value)
        const keys = ["hp", "strength", "magic", "skill", "speed", "defense", "resistance", "luck", "charm", "build"];
        system.attributes ??= {};
        for (const k of keys) {
            const v = baseStats?.[k] ?? 0;
            const cap = (caps?.[k] ?? system.attributes[k]?.max ?? v);
            system.attributes[k] = { value: v, max: cap };
        }

        // Merge growths and caps onto actor
        system.growthRates = foundry.utils.mergeObject(system.growthRates || {}, growths || {}, { overwrite: true });
        system.statCaps = foundry.utils.mergeObject(system.statCaps || {}, caps || {}, { overwrite: true });

        // Fill missing weapon rank keys, do not overwrite existing
        system.weaponRanks = foundry.utils.mergeObject(
            foundry.utils.deepClone(system.weaponRanks || {}),
            foundry.utils.deepClone(DEFAULT_WEAPON_RANKS),
            { inplace: false, overwrite: false }
        );

        if (!system.weaponRanks) system.weaponRanks = foundry.utils.deepClone(DEFAULT_WEAPON_RANKS);

        for (const key of Object.keys(DEFAULT_WEAPON_RANKS)) {
            if (system.weaponRanks[key] === undefined || Array.isArray(system.weaponRanks[key])) {
                system.weaponRanks[key] = "";
            }
        }

        const bonus = this._collectBonuses();
        for (const k of keys) {
            system.attributes[k].value = (system.attributes[k].value || 0) + (bonus.attributes[k] || 0);
            system.attributes[k].max = (system.attributes[k].max || 0) + (bonus.maximums[k] || 0);
            system.growthRates[k] = (system.growthRates?.[k] || 0) + (bonus.growthRates[k] || 0);
        }

        system.movement ??= {};
        system.movement.base = (system.movement.base || 0) + (bonus.attributes.move || 0);
        system.movement.current = (system.movement.current || 0) + (bonus.attributes.move || 0);

        const equippedWeapon = this.items.find(i => i.type === "weapon" && i.system?.equipped);
        const weaponHit = Number(equippedWeapon?.system?.hit || 0);
        const weaponCrit = Number(equippedWeapon?.system?.crit || 0);
        const weaponWeight = Number(equippedWeapon?.system?.weight || 0);
        const build = Number(system.attributes?.build?.value || 0);
        const attackSpeed = Number(system.attributes?.speed?.value || 0) - Math.max(weaponWeight - build, 0) + (bonus.combat.attackSpeed || 0);

        // Derived combat
        const a = system.attributes || {};
        system.combat = {
            attackSpeed,
            hitRate: (a.skill?.value || 0) + Math.floor((a.luck?.value || 0) / 4) + weaponHit + (bonus.combat.hitRate || 0),
            critRate: Math.floor((a.skill?.value || 0) / 2) + weaponCrit + (bonus.combat.critRate || 0),
            avoid: attackSpeed + Math.floor((a.luck?.value || 0) / 4) + (bonus.combat.avoid || 0),
            dodge: (a.luck?.value || 0) + (bonus.combat.dodge || 0)
        };
    }

    async levelUp() {
        const system = this.system;
        const growthRates = system.growthRates || {};
        const gains = {};

        for (const [stat, growth] of Object.entries(growthRates)) {
            const roll = await new Roll("1d10").evaluate();
            if (roll.total <= growth) {
                gains[stat] = 1;
                const cur = system.attributes?.[stat]?.value || 0;
                await this.update({ [`system.attributes.${stat}.value`]: cur + 1 });
            } else {
                gains[stat] = 0;
            }
        }

        const newLevel = (system.level || 1) + 1;
        await this.update({ "system.level": newLevel });

        ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this }),
            content: `<h3>${this.name} reached level ${newLevel}!</h3>`
        });
    }

    canUseWeapon(weapon) {
        if (!weapon?.system?.weaponType || !weapon?.system?.rank) return true;
        const actorRank = this.system.weaponRanks?.[weapon.system.weaponType] || "";
        if (!actorRank) return false;
        return FEUE.WEAPON_RANKS[actorRank].order >= FEUE.WEAPON_RANKS[weapon.system.rank].order;
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
            width: 800,
            height: 950,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }]
        });
    }

    getData() {
        const data = super.getData();
        data.FEUE = FEUE;
        data.weaponRankOptions = Object.entries(FEUE.WEAPON_RANKS).map(([key, value]) => ({ key, label: value.label }));

        // Partition items by type
        data.classes = this.actor.items.filter(i => i.type === "class");
        data.skills = this.actor.items.filter(i => i.type === "skill");
        data.spells = this.actor.items.filter(i => i.type === "spell");
        data.combatArts = this.actor.items.filter(i => i.type === "combatArt");
        data.miscBonuses = this.actor.items.filter(i => i.type === "item" && i.system?.itemType === "miscBonus");
        data.weapons = this.actor.items.filter(i => i.type === "weapon");
        data.battalion = this.actor.items.find(i => i.type === "battalion") || null;
        data.items = this.actor.items.filter(i => i.type === "item" && i.system?.itemType !== "miscBonus");
        data.inventory = this._getInventoryUsage();

        // Mark the "equipped" class
        data.equippedClass = data.classes.find(c => c.system.equipped);

        return data;
    }

    _getInventoryUsage() {
        const used = this.actor.items.filter(i => i.type === "weapon" || (i.type === "item" && i.system?.itemType !== "miscBonus")).length;
        return { used, max: 5, full: used >= 5 };
    }

    activateListeners(html) {
        super.activateListeners(html);
        if (!this.options.editable) return;

        html.find(".level-up").click(async () => this.actor.levelUp());

        html.find(".item-control.item-create").click(async (ev) => this._onItemCreate(ev));
        html.find(".item-control.roll-attack").click(async (ev) => this._rollWeapon(ev));
        html.find(".item-control.roll-battalion").click(async (ev) => this._rollBattalion(ev));
        html.find(".item-control.roll-spell").click(async (ev) => this._rollSpell(ev));
        html.find(".item-control.roll-combat-art").click(async (ev) => this._rollCombatArt(ev));

        // Generic item controls
        html.find(".item-control.item-edit").click(ev => {
            const li = $(ev.currentTarget).closest(".item");
            const item = this.actor.items.get(li.data("itemId"));
            if (item) item.sheet.render(true);
        });

        html.find(".item-control.item-delete").click(ev => {
            const li = $(ev.currentTarget).closest(".item");
            const item = this.actor.items.get(li.data("itemId"));
            if (item) item.delete();
            li.slideUp(200, () => this.render(false));
        });

        // Weapon rank dropdowns (target select elements specifically)
        html.find("select.weapon-rank-select").change(async (ev) => {
            const el = ev.currentTarget;
            await this.actor.update({ [el.name]: el.value });
        });

        // Class equip/unequip
        html.find(".item-control.class-equip").click(async (ev) => {
            const li = $(ev.currentTarget).closest(".item");
            const item = this.actor.items.get(li.data("itemId"));
            if (!item) return;

            const currentlyEquipped = !!item.system.equipped;
            if (currentlyEquipped) {
                const ok = await Dialog.confirm({
                    title: "Unequip Class",
                    content: "<p>Are you sure? This will erase all class-applied stats, growths, and caps.</p>"
                });
                if (!ok) return;

                await item.update({ "system.equipped": false });
                await this.actor.update({
                    "system.attributes": {},
                    "system.growthRates": {},
                    "system.statCaps": {}
                });
                return;
            }

            // Equip class
            const t = item.system.classType;
            if (t === "Promoted") {
                const hasStd = this.actor.items.some(i => i.type === "class" && i.system.equipped && i.system.classType === "Standard");
                if (!hasStd) { ui.notifications.error("Promoted requires a Standard equipped."); return; }
            }
            if (t === "Advanced" || t === "Enemy Only") {
                const others = this.actor.items.filter(i => i.type === "class" && i.system.equipped && i.id !== item.id);
                if (others.length) await this.actor.updateEmbeddedDocuments("Item", others.map(c => ({ _id: c.id, "system.equipped": false })));
            }
            await item.update({ "system.equipped": true });
        });

        // Weapon equip/unequip
        html.find(".item-control.weapon-equip").click(async (ev) => {
            const li = $(ev.currentTarget).closest(".item");
            const item = this.actor.items.get(li.data("itemId"));
            if (!item || item.type !== "weapon") return;

            const currentlyEquipped = !!item.system.equipped;
            if (currentlyEquipped) {
                await item.update({ "system.equipped": false });
                return;
            }

            const equippedWeapons = this.actor.items.filter(i => i.type === "weapon" && i.system.equipped && i.id !== item.id);
            if (equippedWeapons.length) {
                await this.actor.updateEmbeddedDocuments("Item", equippedWeapons.map(w => ({ _id: w.id, "system.equipped": false })));
            }
            await item.update({ "system.equipped": true });
        });
    }

    async _onItemCreate(event) {
        event.preventDefault();
        const button = event.currentTarget;
        const type = button.dataset.type;
        if (!type) return ui.notifications.error("Missing item type on create button.");

        const inventory = this._getInventoryUsage();
        const itemSubtype = button.dataset.itemSubtype;
        if ((type === "item" && itemSubtype !== "miscBonus") || type === "weapon") {
            if (inventory.full) return ui.notifications.error("Inventory full: characters can only hold 5 total weapons/items.");
        }
        if (type === "battalion" && this.actor.items.some(i => i.type === "battalion")) {
            return ui.notifications.error("Characters can only have one battalion.");
        }

        const defaultName = (type === "item" && itemSubtype === "miscBonus") ? "New Misc Bonus" : `New ${type.charAt(0).toUpperCase()}${type.slice(1)}`;
        const itemData = {
            name: defaultName,
            type
        };
        if (type === "item" && itemSubtype) itemData.system = { itemType: itemSubtype };
        const [created] = await this.actor.createEmbeddedDocuments("Item", [itemData]);
        if (created) created.sheet.render(true);
    }

    async _rollWeapon(ev) {
        const li = $(ev.currentTarget).closest(".item");
        const weapon = this.actor.items.get(li.data("itemId"));
        if (!weapon) return;
        await this._rollAttackWith({ label: weapon.name, hit: weapon.system?.hit, crit: weapon.system?.crit, might: weapon.system?.might });
    }

    async _rollBattalion(ev) {
        const li = $(ev.currentTarget).closest(".item");
        const battalion = this.actor.items.get(li.data("itemId"));
        if (!battalion) return;
        await this._rollAttackWith({ label: `${battalion.name} (Battalion)`, hit: battalion.system?.hit, crit: battalion.system?.crit, might: battalion.system?.might });
    }

    async _rollSpell(ev) {
        const li = $(ev.currentTarget).closest(".item");
        const spell = this.actor.items.get(li.data("itemId"));
        if (!spell) return;

        const hpCost = Number(spell.system?.hpCost || 0);
        const currentHp = Number(this.actor.system?.attributes?.hp?.value || 0);
        if (hpCost > 0) {
            const newHp = Math.max(currentHp - hpCost, 0);
            await this.actor.update({ "system.attributes.hp.value": newHp });
        }
        await this._rollAttackWith({ label: `${spell.name} (Spell)`, hit: spell.system?.hit, crit: spell.system?.crit, might: spell.system?.might });
    }

    async _rollCombatArt(ev) {
        const li = $(ev.currentTarget).closest(".item");
        const art = this.actor.items.get(li.data("itemId"));
        if (!art) return;
        const weapons = this.actor.items.filter(i => i.type === "weapon");
        if (!weapons.length) return ui.notifications.warn("No weapons available for this combat art.");
        const choices = weapons.map(w => `<option value="${w.id}" ${w.system?.equipped ? "selected" : ""}>${w.name}</option>`).join("");
        const selectedId = await Dialog.prompt({
            title: "Choose Weapon",
            content: `<div class="form-group"><label>Weapon</label><select id="combat-art-weapon">${choices}</select></div>`,
            callback: (html) => html.find("#combat-art-weapon").val()
        });
        const weapon = weapons.find(w => w.id === selectedId) || weapons.find(w => w.system?.equipped) || weapons[0];
        await this._rollAttackWith({ label: `${art.name} (${weapon.name})`, hit: weapon.system?.hit, crit: weapon.system?.crit, might: weapon.system?.might });
    }

    async _rollAttackWith({ label, hit = 0, crit = 0, might = 0 }) {
        const roll = await (new Roll("1d100")).evaluate();
        const totalHit = (Number(this.actor.system?.combat?.hitRate || 0) - Number((this.actor.items.find(i => i.type === "weapon" && i.system?.equipped)?.system?.hit) || 0)) + Number(hit || 0);
        const totalCrit = (Number(this.actor.system?.combat?.critRate || 0) - Number((this.actor.items.find(i => i.type === "weapon" && i.system?.equipped)?.system?.crit) || 0)) + Number(crit || 0);
        const isHit = roll.total <= totalHit;
        const critRoll = await (new Roll("1d100")).evaluate();
        const isCrit = isHit && critRoll.total <= totalCrit;

        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            content: `<h3>${label}</h3>
            <p>Hit Roll: <strong>${roll.total}</strong> vs ${totalHit} (${isHit ? "Hit" : "Miss"})</p>
            <p>Crit Roll: <strong>${critRoll.total}</strong> vs ${totalCrit} (${isCrit ? "Crit" : "No Crit"})</p>
            <p>Might: <strong>${might || 0}</strong></p>`
        });
    }
}

// ====================================================================
// 4. ITEM CLASS & SHEET
// ====================================================================
class FireEmblemItem extends Item {
    prepareBaseData() {
        super.prepareBaseData();

        const validTypes = Object.keys(game.system.template.Item || {});
        if (!this.type && validTypes.length) {
            this._source.type = validTypes[0];
        }
    }

    prepareDerivedData() {
        if (this.type === "weapon") {
            // any weapon-specific calc
        }
    }
}

class FireEmblemItemSheet extends ItemSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["feue", "sheet", "item"],
            template: "systems/feue/templates/item/item-sheet.html",
            width: 600,
            height: 600,
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

        // Autosave scalar fields
        html.find("input, select, textarea").change(ev => this._saveField(ev));
    }

    async _saveField(ev) {
        const el = ev.currentTarget;
        if (!el.name) return;

        let value = el.value;
        if (el.dataset.dtype === "Number") {
            const n = Number(value);
            value = Number.isFinite(n) ? n : null;
        } else if (el.type === "checkbox") {
            value = el.checked;
        }

        console.log("Saving field", el.name, "=", value);
        await this.item.update({ [el.name]: value });
    }

    async _updateObject(event, formData) {
        return await this.object.update(foundry.utils.expandObject(formData));
    }
}

// ====================================================================
// 5. HOOKS
// ====================================================================
Hooks.once("init", () => {
    console.log("FEUE | Initializing system");

    Handlebars.registerHelper("math", function (lvalue, operator, rvalue, options) {
        lvalue = parseFloat(lvalue);
        rvalue = parseFloat(rvalue);
        return {
            "+": lvalue + rvalue,
            "-": lvalue - rvalue,
            "*": lvalue * rvalue,
            "/": lvalue / rvalue,
            "%": lvalue % rvalue
        }[operator];
    });

    // FIXED: Use regular function, not arrow, so Handlebars `this` context works
    Handlebars.registerHelper("ifEquals", function (a, b, opts) {
        return a == b ? opts.fn(this) : opts.inverse(this);
    });

    Handlebars.registerHelper("join", function (array, sep) {
        return Array.isArray(array) ? array.join(sep || ", ") : "";
    });

    Handlebars.registerHelper("eq", function (a, b) {
        return a === b;
    });

    Handlebars.registerHelper("checked", function (value) {
        return value ? "checked" : "";
    });

    Handlebars.registerHelper("lookup", function (obj, key) {
        return obj?.[key];
    });

    // Register sheets
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("feue", FireEmblemCharacterSheet, { types: ["character"], makeDefault: true });

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("feue", FireEmblemItemSheet, { makeDefault: true });

    CONFIG.Actor.documentClass = FireEmblemActor;
    CONFIG.Item.documentClass = FireEmblemItem;
});

Hooks.once("ready", () => {
    console.log("FEUE | System Ready");

    const defaultWeaponType = "sword";

    const worldWeaponItems = game.items.filter(i => i.type === "weapon");
    for (const item of worldWeaponItems) {
        if (!item.system?.weaponType) continue;
        const normalized = String(item.system.weaponType).toLowerCase();
        if (FEUE.WeaponTypes[normalized] && normalized !== item.system.weaponType) {
            item.updateSource({ "system.weaponType": normalized });
        } else if (!FEUE.WeaponTypes[normalized]) {
            item.updateSource({ "system.weaponType": defaultWeaponType });
        }
    }
});

Hooks.on("preCreateItem", (item, createData) => {
    const parent = item.parent;
    if (!parent || parent.documentName !== "Actor") return true;

    const type = createData.type ?? item.type;
    if (!type) return false;

    const isMiscBonusItem = type === "item" && ((createData.system?.itemType === "miscBonus") || (createData["system.itemType"] === "miscBonus"));
    if ((type === "item" && !isMiscBonusItem) || type === "weapon") {
        const used = parent.items.filter(i => i.type === "weapon" || (i.type === "item" && i.system?.itemType !== "miscBonus")).length;
        if (used >= 5) {
            ui.notifications.error(`${parent.name} is at the 5-slot inventory limit (weapons/items).`);
            return false;
        }
    }

    if (type === "battalion") {
        const hasBattalion = parent.items.some(i => i.type === "battalion");
        if (hasBattalion) {
            ui.notifications.error(`${parent.name} can only have one battalion.`);
            return false;
        }
    }
    return true;
});
