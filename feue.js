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
    unitTypes: ["Infantry"]
};

// ====================================================================
// 1. CORE ACTOR CLASSES
// ====================================================================
class FireEmblemActor extends Actor {

    /**
     * Prepare derived data for the actor
     */
    prepareDerivedData() {
        const actorData = this;
        const systemData = actorData.system;

        // Apply class data if available
        const classItem = this.items.find(i => i.type === "class" && i.system.equipped);
        if (classItem) {
            this._applyClassData(systemData, classItem.system);
        }

        // Calculate derived combat stats
        this._prepareCharacterData(systemData);
    }

    /**
     * Apply class-specific data
     */
    _applyClassData(systemData, classData) {
        // Update unit types
        const hasCustomUnitTypes = Array.isArray(systemData.unitTypes)
            && systemData.unitTypes.length > 0
            && (systemData.unitTypes.length !== FALLBACK_ACTOR_DATA.unitTypes.length
                || systemData.unitTypes.some((type, index) => type !== FALLBACK_ACTOR_DATA.unitTypes[index]));
        if (!hasCustomUnitTypes) {
            const classUnitTypes = Array.isArray(classData.unitTypes) && classData.unitTypes.length > 0
                ? classData.unitTypes
                : FALLBACK_ACTOR_DATA.unitTypes;
            systemData.unitTypes = foundry.utils.duplicate(classUnitTypes);
        }

        // Update movement if not manually changed
        const usingDefaultMovement = (!systemData.movement?.base && !systemData.movement?.current)
            || (systemData.movement?.base === FALLBACK_ACTOR_DATA.movement.base
                && systemData.movement?.current === FALLBACK_ACTOR_DATA.movement.current);
        if (usingDefaultMovement && classData.movement !== undefined) {
            systemData.movement = systemData.movement || {};
            systemData.movement.base = classData.movement;
            systemData.movement.current = classData.movement;
        }

        // Update stat caps from class
        if (classData.statCaps) {
            for (const [stat, cap] of Object.entries(classData.statCaps)) {
                if (systemData.attributes[stat]) {
                    const defaultMax = FALLBACK_ACTOR_DATA.attributes[stat]?.max;
                    const hasCustomCap = defaultMax !== undefined && systemData.attributes[stat].max !== defaultMax;
                    if (!hasCustomCap) {
                        systemData.attributes[stat].max = cap;
                    }
                }
            }
        }

        // Update growth rates from class
        if (classData.growthRates) {
            for (const [stat, growth] of Object.entries(classData.growthRates)) {
                const defaultGrowth = FALLBACK_ACTOR_DATA.growthRates[stat];
                const hasCustomGrowth = defaultGrowth !== undefined && systemData.growthRates?.[stat] !== defaultGrowth;
                if (!hasCustomGrowth) {
                    systemData.growthRates = systemData.growthRates || {};
                    systemData.growthRates[stat] = growth;
                }
            }
        }

        // Ensure weapon proficiencies exist without overwriting manual edits
        const weaponRankDefaults = {};
        for (const weaponType of Object.keys(FEUE.WeaponTypes)) {
            weaponRankDefaults[weaponType] = systemData.weaponRanks?.[weaponType] || "";
        }
        systemData.weaponRanks = weaponRankDefaults;

        if (classData.weaponProficiencies) {
            for (const weapon of classData.weaponProficiencies) {
                if (!systemData.weaponRanks[weapon]) {
                    systemData.weaponRanks[weapon] = "E";
                }
            }
        }
    }

    /**
     * Prepare character-specific data
     */
    _prepareCharacterData(systemData) {
        if (!systemData.attributes) return;

        const attrs = systemData.attributes;

        // Calculate hit rate (Weapon Hit + Skill + Luck/4)
        systemData.combat = systemData.combat || {};
        systemData.combat.hitRate = (attrs.skill?.value || 0) + Math.floor((attrs.luck?.value || 0) / 4);

        // Calculate critical rate (Weapon Crit + Skill/2)
        systemData.combat.critRate = Math.floor((attrs.skill?.value || 0) / 2);

        // Calculate avoid (Speed + Luck/4)
        systemData.combat.avoid = (attrs.speed?.value || 0) + Math.floor((attrs.luck?.value || 0) / 4);

        // Calculate dodge (Luck)
        systemData.combat.dodge = attrs.luck?.value || 0;

        // Calculate fate points (Luck / 5)
        if (systemData.fatePoints) {
            systemData.fatePoints.max = Math.floor((attrs.luck?.value || 0) / 5);
        }
    }

    /**
     * Roll for level up stat gains
     */
    async levelUp() {
        const systemData = this.system;
        const growthRates = systemData.growthRates;
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
                const maxValue = systemData.attributes[stat]?.max || 20;
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

        const actorRank = this.system.weaponRanks?.[weapon.system.weaponType] || "";
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
            submitOnChange: true
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
                max: (data.actor.system.attributes.build?.value || 7) * 10
            };

            return data;

        } catch (error) {
            console.error("Error in getData():", error);
            return {
                actor: this.actor,
                system: this.actor?.system || FALLBACK_ACTOR_DATA,
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

        // Weapon rank changes
        html.find('.weapon-rank').change(this._onWeaponRankChange.bind(this));

        // Item controls
        html.find('.item-edit').click(this._onItemEdit.bind(this));
        html.find('.item-delete').click(this._onItemDelete.bind(this));
        html.find('.item-equip').click(this._onItemEquip.bind(this));

        // Combat rolls
        html.find('.roll-attack').click(this._onRollAttack.bind(this));
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
        const value = element.value.split(',').map(s => s.trim()).filter(s => s.length > 0);

        await this.item.update({ [field]: value });
    }

    /**
     * Override _updateObject to handle form data properly
     */
    async _updateObject(event, formData) {
        // Handle array fields specifically
        if (formData["system.unitTypes"] && typeof formData["system.unitTypes"] === "string") {
            formData["system.unitTypes"] = formData["system.unitTypes"].split(',').map(s => s.trim()).filter(s => s.length > 0);
        }
        if (formData["system.weaponProficiencies"] && typeof formData["system.weaponProficiencies"] === "string") {
            formData["system.weaponProficiencies"] = formData["system.weaponProficiencies"].split(',').map(s => s.trim()).filter(s => s.length > 0);
        }
        if (formData["system.promotesInto"] && typeof formData["system.promotesInto"] === "string") {
            formData["system.promotesInto"] = formData["system.promotesInto"].split(',').map(s => s.trim()).filter(s => s.length > 0);
        }

        // Update the item
        return super._updateObject(event, formData);
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