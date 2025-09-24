// Fire Emblem: Ultimate Edition system for Foundry VTT
// Entry point and core system implementation

// Constants
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
        "staff": "Staff"
    }
};

// Fallback data for safety
const FALLBACK_ACTOR_DATA = {
    attributes: {
        hp: { value: 15, max: 45 },
        strength: { value: 5, max: 15 },
        magic: { value: 0, max: 15 },
        skill: { value: 5, max: 15 },
        speed: { value: 5, max: 15 },
        defense: { value: 2, max: 15 },
        resistance: { value: 0, max: 15 },
        luck: { value: 2, max: 30 },
        charm: { value: 1, max: 15 },
        build: { value: 7, max: 15 }
    },
    growthRates: {
        hp: 4,
        strength: 8,
        magic: 2,
        skill: 6,
        speed: 4,
        luck: 2,
        charm: 2,
        build: 2
    },
    movement: {
        base: 4,
        current: 4
    },
    unitTypes: ["Infantry"],
    weaponRanks: {}
};

const DEFAULT_WEAPON_RANKS = Object.fromEntries(
    Object.keys(FEUE.WeaponTypes).map(type => [type, ""])
);

FALLBACK_ACTOR_DATA.weaponRanks = Object.assign({}, DEFAULT_WEAPON_RANKS);

function normalizeNumber(value) {
    if (value === undefined || value === null) return null;
    if (typeof value === "string" && value.trim() === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function hasCustomArrayValues(values, fallback) {
    if (!Array.isArray(values)) return false;
    const cleaned = values.map(v => v?.trim?.() ?? v).filter(v => v !== undefined && v !== null && `${v}`.length > 0);
    if (cleaned.length === 0) return false;
    if (!Array.isArray(fallback) || cleaned.length !== fallback.length) return true;
    return cleaned.some((value, index) => value !== fallback[index]);
}

// ====================================================================
// 1. CORE ACTOR CLASSES
// ====================================================================
class FireEmblemActor extends Actor {

    /**
     * Prepare derived data for the actor
     */
    prepareDerivedData() {
        const systemData = this.system;
        const classItem = this.items.find(i => i.type === "class" && i.system.equipped);
        const baseSystem = foundry.utils.duplicate(this._source?.system || {});

        systemData.classAdjusted = this._buildClassAdjustedData(baseSystem, classItem?.system);
        systemData.weaponRanks = foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_WEAPON_RANKS), systemData.weaponRanks || {}, {
            inplace: false,
            overwrite: true
        });
        systemData.unitTypes = Array.isArray(systemData.unitTypes) ? systemData.unitTypes : [];


        // Calculate derived combat stats using the adjusted values
        this._prepareCharacterData(systemData);
    }

    /**
     * Build a non-destructive snapshot of the actor's data that includes class defaults
     * for any fields the user has not overridden manually.
     */
    _buildClassAdjustedData(baseSystem, classData) {
        const display = foundry.utils.mergeObject(foundry.utils.deepClone(FALLBACK_ACTOR_DATA), baseSystem, {
            inplace: false,
            overwrite: true,
            insertKeys: true
        });

        display.weaponRanks = foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_WEAPON_RANKS), baseSystem.weaponRanks || {}, {
            inplace: false,
            overwrite: true
        });

        // Ensure nested structures exist
        display.attributes = display.attributes || foundry.utils.deepClone(FALLBACK_ACTOR_DATA.attributes);
        display.growthRates = display.growthRates || foundry.utils.deepClone(FALLBACK_ACTOR_DATA.growthRates);
        display.movement = display.movement || foundry.utils.deepClone(FALLBACK_ACTOR_DATA.movement);
        display.unitTypes = Array.isArray(display.unitTypes) ? display.unitTypes.slice() : [];

        if (!classData) {
            return display;
        }

        // Unit types are provided by the class unless the actor has customised them
        const actorUnitTypes = baseSystem.unitTypes;
        if (!hasCustomArrayValues(actorUnitTypes, FALLBACK_ACTOR_DATA.unitTypes)) {
            const classUnitTypes = hasCustomArrayValues(classData.unitTypes, [])
                ? classData.unitTypes
                : FALLBACK_ACTOR_DATA.unitTypes;
            display.unitTypes = foundry.utils.duplicate(classUnitTypes);
        }

        // Apply class movement when the actor is still using the fallback values
        const baseMovement = baseSystem.movement || {};
        const fallbackMovement = FALLBACK_ACTOR_DATA.movement;
        const baseMovementValues = {
            base: normalizeNumber(baseMovement.base),
            current: normalizeNumber(baseMovement.current)
        };
        const fallbackMovementValues = {
            base: normalizeNumber(fallbackMovement.base),
            current: normalizeNumber(fallbackMovement.current)
        };
        const usesFallbackMovement = (!Number.isFinite(baseMovementValues.base) && !Number.isFinite(baseMovementValues.current))
            || (baseMovementValues.base === fallbackMovementValues.base && baseMovementValues.current === fallbackMovementValues.current);

        if (usesFallbackMovement) {
            const classMovement = normalizeNumber(classData.movement);
            const movementValue = Number.isFinite(classMovement) ? classMovement : fallbackMovementValues.base;
            display.movement.base = movementValue;
            display.movement.current = movementValue;
        }

        // Apply stat caps while respecting manual overrides
        if (classData.statCaps) {
            for (const [stat, cap] of Object.entries(classData.statCaps)) {
                if (!display.attributes[stat]) continue;

                const fallbackMax = normalizeNumber(FALLBACK_ACTOR_DATA.attributes[stat]?.max);
                const actorMax = normalizeNumber(baseSystem.attributes?.[stat]?.max);
                const hasCustomCap = Number.isFinite(actorMax) && actorMax !== fallbackMax;

                if (!hasCustomCap) {
                    display.attributes[stat].max = cap;
                }
            }
        }

        // Apply growth rates while respecting manual overrides
        if (classData.growthRates) {
            for (const [stat, growth] of Object.entries(classData.growthRates)) {
                const fallbackGrowth = normalizeNumber(FALLBACK_ACTOR_DATA.growthRates?.[stat]);
                const actorGrowth = normalizeNumber(baseSystem.growthRates?.[stat]);
                const hasCustomGrowth = Number.isFinite(actorGrowth) && actorGrowth !== fallbackGrowth;

                if (!hasCustomGrowth) {
                    display.growthRates[stat] = growth;

                }
            }
        }

        // Ensure weapon proficiencies exist without overwriting manual edits
        if (Array.isArray(classData.weaponProficiencies)) {
            for (const weapon of classData.weaponProficiencies) {
                if (!display.weaponRanks[weapon]) {
                    display.weaponRanks[weapon] = "E";
                }
            }
        }

        return display;

    }

    /**
     * Prepare character-specific data
     */
    _prepareCharacterData(systemData) {
        const source = systemData.classAdjusted || systemData;
        if (!source.attributes) return;

        const attrs = source.attributes;
        const combat = {
            hitRate: (attrs.skill?.value || 0) + Math.floor((attrs.luck?.value || 0) / 4),
            critRate: Math.floor((attrs.skill?.value || 0) / 2),
            avoid: (attrs.speed?.value || 0) + Math.floor((attrs.luck?.value || 0) / 4),
            dodge: attrs.luck?.value || 0
        };

        systemData.combat = combat;

        if (systemData.classAdjusted) {
            systemData.classAdjusted.combat = foundry.utils.deepClone(combat);
        }

        if (systemData.fatePoints) {
            systemData.fatePoints.max = Math.floor((attrs.luck?.value || 0) / 5);
        }
    }

    /**
     * Roll for level up stat gains
     */
    async levelUp() {
        const systemData = this.system;
        const growthRates = systemData.classAdjusted?.growthRates || systemData.growthRates;
        const gains = {};
        let totalGains = 0;

        for (const [stat, growth] of Object.entries(growthRates)) {
            const roll = await new Roll("1d10").evaluate();

            if (roll.total <= growth || growth >= 10) {
                let gain = 1;
                if (growth >= 10) gain = 1; // Guaranteed gain
                if (growth > 10 && roll.total <= (growth - 10)) gain = 2; // Extra gain

                gains[stat] = gain;
                totalGains += gain;

                // Update the actual stat
                const currentValue = systemData.attributes[stat]?.value || 0;
                const maxValue = systemData.classAdjusted?.attributes?.[stat]?.max || systemData.attributes[stat]?.max || 20;
                const newValue = Math.min(currentValue + gain, maxValue);

                await this.update({ [`system.attributes.${stat}.value`]: newValue });
            } else {
                gains[stat] = 0;
            }
        }

        // Update level
        const newLevel = (systemData.level || 1) + 1;
        const newTotalLevel = (systemData.totalLevel || 1) + 1;

        await this.update({
            "system.level": newLevel,
            "system.totalLevel": newTotalLevel
        });

        // Create chat message for level up
        const content = `
      <div class="feue-levelup">
        <h3>${this.name} gained a level!</h3>
        <p><strong>Level:</strong> ${newLevel} (Total: ${newTotalLevel})</p>
        <div class="stat-gains">
          ${Object.entries(gains).map(([stat, gain]) =>
            gain > 0 ? `<span class="gain">${stat.toUpperCase()}: +${gain}</span>` : ''
        ).filter(s => s).join(' ')}
        </div>
      </div>
    `;

        ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this }),
            content: content
        });

        return gains;
    }

    /**
     * Check if actor can use a weapon based on weapon rank
     */
    canUseWeapon(weapon) {
        if (!weapon.system.weaponType || !weapon.system.rank) return true;

        const actorRank = this.system.classAdjusted?.weaponRanks?.[weapon.system.weaponType]
            || this.system.weaponRanks?.[weapon.system.weaponType]
            || "";
        if (!actorRank) return false; // No proficiency in this weapon type

        const weaponRank = weapon.system.rank;

        return FEUE.WEAPON_RANKS[actorRank].order >= FEUE.WEAPON_RANKS[weaponRank].order;
    }

    /**
     * Calculate attack damage
     */
    calculateDamage(weapon) {
        if (!weapon) return 0;

        const weaponMight = weapon.system.might || 0;
        const isPhysical = ["sword", "lance", "axe", "bow", "firearm", "unarmed", "knife"].includes(weapon.system.weaponType);
        const attackStat = isPhysical ? (this.system.attributes.strength?.value || 0) : (this.system.attributes.magic?.value || 0);

        return weaponMight + attackStat;
    }

    /**
     * Calculate hit rate with weapon
     */
    calculateHitRate(weapon) {
        if (!weapon) return this.system.combat?.hitRate || 0;

        const weaponHit = weapon.system.hit || 0;
        const baseHit = this.system.combat?.hitRate || 0;

        return weaponHit + baseHit;
    }
}

// ====================================================================
// 2. CHARACTER SHEET IMPLEMENTATION
// ====================================================================
class FireEmblemCharacterSheet extends ActorSheet {

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["feue", "sheet", "actor", "character"],
            template: "systems/feue/templates/actor/character-sheet.html",
            width: 800,
            height: 950,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }],
            closeOnSubmit: false,
            submitOnChange: false  // CHANGED: Turn off auto-submit
        });
    }

    getData() {
        let data;

        if (!this.actor) {
            console.error("Actor is null or undefined in getData()");
            return {
                actor: null,
                system: FALLBACK_ACTOR_DATA,
                items: [],
                dtypes: ["String", "Number", "Boolean"]
            };
        }

        try {
            data = super.getData();
            data.dtypes = ["String", "Number", "Boolean"];
            data.FEUE = FEUE;
            data.systemDisplay = foundry.utils.deepClone(this.actor.system.classAdjusted || this.actor.system);

            // Get equipped class
            const allItems = Array.isArray(data.items) ? data.items : Array.from(data.items || []);
            const equippedClass = allItems.find(i => i.type === "class" && i.system.equipped);
            data.equippedClass = equippedClass;

            // Organize items by type without losing references
            data.weapons = allItems.filter(i => i.type === "weapon");
            const inventoryItems = allItems.filter(i => i.type === "item");
            data.skills = allItems.filter(i => i.type === "skill");
            data.spells = allItems.filter(i => i.type === "spell");
            data.classes = allItems.filter(i => i.type === "class");
            data.items = inventoryItems;

            // Calculate encumbrance (count weapons and carried items)
            const carriedItems = inventoryItems.concat(data.weapons);
            const totalWeight = carriedItems.reduce((total, item) => {
                return total + (item.system.weight || 0) * (item.system.quantity || 1);
            }, 0);

            data.encumbrance = {
                current: totalWeight,
                max: (data.systemDisplay.attributes?.build?.value || data.actor.system.attributes.build?.value || 7) * 10
            };

            return data;

        } catch (error) {
            console.error("Error in getData():", error);
            return {
                actor: this.actor,
                system: this.actor?.system || FALLBACK_ACTOR_DATA,
                systemDisplay: foundry.utils.deepClone(this.actor?.system?.classAdjusted || this.actor?.system || FALLBACK_ACTOR_DATA),
                items: this.actor?.items?.contents || [],
                dtypes: ["String", "Number", "Boolean"],
                FEUE: FEUE
            };
        }
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Level up button
        html.find('.level-up').click(this._onLevelUp.bind(this));

        // Weapon rank changes - handle on change for dropdowns
        html.find('.weapon-rank').change(this._onWeaponRankChange.bind(this));

        // Handle text fields on blur, dropdowns on change
        html.find('select[name="system.affinity"]').change(this._onFieldChange.bind(this));
        html.find('input[name^="system.personalDetails"], textarea[name="system.biography"], textarea[name="system.appearance"]').on('blur', this._onFieldChange.bind(this));

        // Handle attribute and growth rate changes on blur
        html.find('input[name^="system.attributes"], input[name^="system.growthRates"], input[name^="system.movement"]').on('blur', this._onFieldChange.bind(this));

        // Item controls
        html.find('.item-edit').click(this._onItemEdit.bind(this));
        html.find('.item-delete').click(this._onItemDelete.bind(this));
        html.find('.item-equip').click(this._onItemEquip.bind(this));

        // Combat rolls
        html.find('.roll-attack').click(this._onRollAttack.bind(this));
    }

    /**
     * Handle field changes without aggressive sanitization
     */
    async _onFieldChange(event) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const element = event.currentTarget;
        const field = element.name;

        if (!field) return;

        let value = element.value;

        const dtype = element.dataset.dtype;
        if (dtype === "Number" && value !== "") {
            const numValue = Number(value);
            if (Number.isFinite(numValue)) {
                value = numValue;
            }
            // If it's not a valid number, leave it as string and let user fix it
        } else if (dtype === "Boolean") {
            value = element.checked;
        }

        const systemPath = field.startsWith("system.") ? field.slice(7) : field;
        const currentValue = foundry?.utils?.getProperty?.(this.actor.system, systemPath);

        if (currentValue === value) {
            return;
        }

        try {
            await this.actor.update({ [field]: value });
        } catch (error) {
            console.error(`Failed to update field ${field}`, error);
            const errorMessage = game.i18n?.localize?.("FEUE.Errors.fieldUpdateFailed") || `Failed to update ${field}`;
            ui.notifications?.error?.(errorMessage);
        }
    }

    /**
     * Ensure all FEUE item types can be dropped onto the sheet.
     */
    async _onDropItem(event, data) {
        const item = await Item.implementation?.fromDropData?.(data) || await Item.fromDropData?.(data);
        if (!item) return false;

        const allowedTypes = new Set(["weapon", "item", "skill", "spell", "class"]);
        if (!allowedTypes.has(item.type)) {
            return super._onDropItem(event, data);
        }

        // Delegate to the core handler if the item already belongs to this actor
        if (item.parent?.id === this.actor.id) {
            return super._onDropItem(event, data);
        }

        const itemData = item.toObject();
        delete itemData._id;

        return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    /**
     * Handle level up
     */
    async _onLevelUp(event) {
        event.preventDefault();
        await this.actor.levelUp();
    }

    /**
     * Handle weapon rank changes
     */
    async _onWeaponRankChange(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const weaponType = element.dataset.weaponType;
        const newRank = element.value;

        await this.actor.update({ [`system.weaponRanks.${weaponType}`]: newRank });
    }

    /**
     * Handle item editing
     */
    _onItemEdit(event) {
        event.preventDefault();
        const itemId = event.currentTarget.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        item.sheet.render(true);
    }

    /**
     * Handle item deletion
     */
    async _onItemDelete(event) {
        event.preventDefault();
        const itemId = event.currentTarget.closest('.item').dataset.itemId;
        await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
    }

    /**
     * Handle item equipping
     */
    async _onItemEquip(event) {
        event.preventDefault();
        const itemId = event.currentTarget.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);

        // If equipping a class, unequip other classes first
        if (item.type === "class" && !item.system.equipped) {
            const otherClasses = this.actor.items.filter(i => i.type === "class" && i.system.equipped);
            for (const otherClass of otherClasses) {
                await otherClass.update({ "system.equipped": false });
            }
        }

        await item.update({ "system.equipped": !item.system.equipped });
    }

    /**
     * Handle attack rolls
     */
    async _onRollAttack(event) {
        event.preventDefault();
        const weaponId = event.currentTarget.dataset.weaponId;
        const weapon = weaponId ? this.actor.items.get(weaponId) : null;

        const hitRate = this.actor.calculateHitRate(weapon);
        const damage = this.actor.calculateDamage(weapon);

        const roll = await new Roll("1d100").evaluate();
        const isHit = roll.total <= hitRate;

        let content = `
      <div class="feue-attack-roll">
        <h3>${this.actor.name} attacks${weapon ? ` with ${weapon.name}` : ''}!</h3>
        <p><strong>Hit Roll:</strong> ${roll.total} vs ${hitRate}% - ${isHit ? 'HIT' : 'MISS'}</p>
    `;

        if (isHit && weapon) {
            // Roll for critical
            const critRate = this.actor.system.combat.critRate + (weapon.system.crit || 0);
            const critRoll = await new Roll("1d100").evaluate();
            const isCrit = critRoll.total <= critRate;

            const finalDamage = isCrit ? damage * 3 : damage;

            content += `
        <p><strong>Critical Roll:</strong> ${critRoll.total} vs ${critRate}% - ${isCrit ? 'CRITICAL HIT!' : 'Normal Hit'}</p>
        <p><strong>Damage:</strong> ${finalDamage}${isCrit ? ' (Critical!)' : ''}</p>
      `;
        }

        content += '</div>';

        ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            content: content,
            rolls: [roll]
        });
    }
}

// ====================================================================
// 3. ITEM CLASSES & SHEETS
// ====================================================================
class FireEmblemItem extends Item {

    prepareDerivedData() {
        const itemData = this;
        const systemData = itemData.system;

        // Add any item-specific calculations here
        if (itemData.type === "weapon") {
            this._prepareWeaponData(systemData);
        }
    }

    _prepareWeaponData(systemData) {
        // Calculate effective weight based on weapon properties
        // Add weapon triangle advantages/disadvantages
    }
}

class FireEmblemItemSheet extends ItemSheet {

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["feue", "sheet", "item"],
            template: "systems/feue/templates/item/item-sheet.html",
            width: 600,
            height: 600,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
            closeOnSubmit: false,
            submitOnChange: true
        });
    }

    getData() {
        const data = super.getData();
        data.dtypes = ["String", "Number", "Boolean"];
        data.FEUE = FEUE;
        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Handle form submissions properly
        if (!this.options.editable) return;

        // Handle array inputs for unit types and weapon proficiencies
        html.find('input[name="system.unitTypes"]').change(this._onArrayInput.bind(this));
        html.find('input[name="system.weaponProficiencies"]').change(this._onArrayInput.bind(this));
        html.find('input[name="system.promotesInto"]').change(this._onArrayInput.bind(this));
    }

    /**
     * Handle array input fields (convert comma-separated strings to arrays)
     */
    async _onArrayInput(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const field = element.name;
        const update = {};
        foundry.utils.setProperty(update, field, element.value);
        sanitizeDelimitedArrayField(update, field);

        await this.item.update(update);
    }

    /**
     * Override _updateObject to handle form data properly
     */
    async _updateObject(event, formData) {
        const expanded = foundry.utils.expandObject(formData);
        this._cleanItemSubmitData(expanded);

        return this.item.update(expanded);
    }

    _cleanItemSubmitData(data) {
        const numericFields = [
            "system.price",
            "system.weight",
            "system.quantity",
            "system.might",
            "system.hit",
            "system.crit",
            "system.hpCost",
            "system.maxLevel",
            "system.movement",
            "system.level"
        ];

        const nestedNumericFields = [
            "system.uses.value",
            "system.uses.max",
            "system.baseStats.hp",
            "system.baseStats.strength",
            "system.baseStats.magic",
            "system.baseStats.skill",
            "system.baseStats.speed",
            "system.baseStats.defense",
            "system.baseStats.resistance",
            "system.baseStats.luck",
            "system.baseStats.charm",
            "system.baseStats.build",
            "system.growthRates.hp",
            "system.growthRates.strength",
            "system.growthRates.magic",
            "system.growthRates.skill",
            "system.growthRates.speed",
            "system.growthRates.defense",
            "system.growthRates.resistance",
            "system.growthRates.luck",
            "system.growthRates.charm",
            "system.growthRates.build",
            "system.statCaps.hp",
            "system.statCaps.strength",
            "system.statCaps.magic",
            "system.statCaps.skill",
            "system.statCaps.speed",
            "system.statCaps.defense",
            "system.statCaps.resistance",
            "system.statCaps.luck",
            "system.statCaps.charm",
            "system.statCaps.build"
        ];

        for (const path of numericFields.concat(nestedNumericFields)) {
            sanitizeNumberField(data, path);
        }

        sanitizeDelimitedArrayField(data, "system.unitTypes");
        sanitizeDelimitedArrayField(data, "system.weaponProficiencies");
        sanitizeDelimitedArrayField(data, "system.promotesInto");
        sanitizeDelimitedArrayField(data, "system.properties", { delimiter: /[\n,]+/ });

        if (foundry.utils.hasProperty(data, "system.properties") && !Array.isArray(foundry.utils.getProperty(data, "system.properties"))) {
            const props = foundry.utils.getProperty(data, "system.properties");
            foundry.utils.setProperty(data, "system.properties", Array.isArray(props) ? props : []);
        }
    }
}

// ====================================================================
// 4. SYSTEM INITIALIZATION
// ====================================================================
Hooks.once("init", function () {
    console.log("Fire Emblem: Ultimate Edition | Initializing System");

    // Register Handlebars helpers
    Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
        return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('math', function (lvalue, operator, rvalue) {
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

    Handlebars.registerHelper('join', function (array, separator) {
        if (!array || !Array.isArray(array)) return '';
        return array.join(separator || ', ');
    });

    // Register sheet application classes
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("feue", FireEmblemCharacterSheet, {
        types: ["character"],
        makeDefault: true
    });

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("feue", FireEmblemItemSheet, {
        makeDefault: true
    });

    // Register custom document classes
    CONFIG.Actor.documentClass = FireEmblemActor;
    CONFIG.Item.documentClass = FireEmblemItem;

    // Register system settings
    game.settings.register("feue", "useStaticGrowth", {
        name: "Use Static Growth Bonuses",
        hint: "Use predetermined stat growth instead of rolling dice",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register("feue", "casualMode", {
        name: "Casual Mode",
        hint: "Units are knocked out instead of killed",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
});

Hooks.once("ready", function () {
    console.log("Fire Emblem: Ultimate Edition | System Ready");
});