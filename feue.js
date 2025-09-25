// Fire Emblem: Ultimate Edition system for Foundry VTT
// Clean rewrite without sanitizers

// ====================================================================
// 1. CONSTANTS
// ====================================================================
const FEUE = {
    WEAPON_RANKS: {
        "E": { order: 0, label: "E" },
        "D": { order: 1, label: "D" },
        "C": { order: 2, label: "C" },
        "B": { order: 3, label: "B" },
        "A": { order: 4, label: "A" },
        "S": { order: 5, label: "S" },
        "Prf": { order: 6, label: "Prf" }
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

                baseStats = foundry.utils.deepClone((recruit?.system.baseStats) || (standard?.system.baseStats) || {});
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
            foundry.utils.deepClone(DEFAULT_WEAPON_RANKS),
            system.weaponRanks || {},
            { inplace: false, overwrite: false }
        );

        // Derived combat
        const a = system.attributes || {};
        system.combat = {
            hitRate: (a.skill?.value || 0) + Math.floor((a.luck?.value || 0) / 4),
            critRate: Math.floor((a.skill?.value || 0) / 2),
            avoid: (a.speed?.value || 0) + Math.floor((a.luck?.value || 0) / 4),
            dodge: a.luck?.value || 0
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

        // Partition items by type
        data.classes = this.actor.items.filter(i => i.type === "class");
        data.skills = this.actor.items.filter(i => i.type === "skill");
        data.spells = this.actor.items.filter(i => i.type === "spell");
        data.weapons = this.actor.items.filter(i => i.type === "weapon" || i.type === "battalion");
        data.items = this.actor.items.filter(i => i.type === "item");

        // Optionally: mark the "equipped" class
        data.equippedClass = data.classes.find(c => c.system.equipped);

        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);
        if (!this.options.editable) return;

        // Generic item controls: apply to all .item elements regardless of which section
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

        html.find(".item-control.item-equip").click(ev => {
            const li = $(ev.currentTarget).closest(".item");
            const item = this.actor.items.get(li.data("itemId"));
            if (!item) return;

            // Toggle equipped state
            const equipped = !item.system.equipped;
            item.update({ "system.equipped": equipped });
        });

        html.find(".weapon-rank").change(async (ev) => {
            const el = ev.currentTarget;
            await this.actor.update({ [el.name]: el.value });
        });

        html.find(".item-control.item-equip").click(async (ev) => {
            const li = $(ev.currentTarget).closest(".item");
            const item = this.actor.items.get(li.data("itemId"));
            if (!item) return;

            const equipped = !!item.system.equipped;

            if (equipped) {
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

            // Equipping
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
    }

}

// ====================================================================
// 4. ITEM CLASS & SHEET
// ====================================================================
class FireEmblemItem extends Item {
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

    Handlebars.registerHelper("ifEquals", (a, b, opts) =>
        a == b ? opts.fn(this) : opts.inverse(this)
    );

    Handlebars.registerHelper("join", (array, sep) =>
        Array.isArray(array) ? array.join(sep || ", ") : ""
    );

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
});