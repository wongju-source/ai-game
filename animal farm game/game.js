// --- Game Constants ---
const ROLES = {
    TYRANT: 'Tyrant',
    LOYALIST: 'Loyalist',
    REBEL: 'Rebel',
    COLLABORATOR: 'Collaborator'
};
const STARTING_HEALTH = 4;
const HAND_LIMIT = 4;

// --- Character Data ---
const Characters = [
    { name: 'Napoleon', health: 4, rolePool: [ROLES.TYRANT], 
      skill: { name: "Propaganda", desc: "Draw 2, then force an opponent to discard 1.", type: 'Active' } },
    { name: 'Snowball', health: 3, rolePool: [ROLES.REBEL, ROLES.LOYALIST], 
      skill: { name: "Windmill Plans", desc: "Draw +1 card at start of turn.", type: 'Passive' } },
    { name: 'Boxer', health: 5, rolePool: [ROLES.LOYALIST], 
      skill: { name: "Work Harder", desc: "Once per turn: Heal 1 HP OR draw 3 cards (but skip attack phase).", type: 'Active' } },
    { name: 'Squealer', health: 3, rolePool: [ROLES.COLLABORATOR, ROLES.LOYALIST], 
      skill: { name: "Revising History", desc: "Can swap a card with any player who has < 2 HP.", type: 'Active' } },
    // Simplified characters for a 4-player game
];

// --- Card Data ---
const CardPrototypes = [
    { name: 'The Gun', type: 'Attack', count: 20, effect: 'Deal 1 damage.' },
    { name: 'Dodge', type: 'Defense', count: 15, effect: 'Cancel an incoming Attack.' },
    { name: 'Apple Ration', type: 'Health', count: 10, effect: 'Restore 1 Health Point.' },
    { name: 'The Dogs', type: 'Disruption', count: 5, effect: 'Target player discards 2 cards.' },
    { name: 'Seven Commandments', type: 'Control', count: 5, effect: 'Target player skips their next draw phase.' },
    { name: 'Old Major\'s Dream', type: 'Special', count: 3, effect: 'Global Attack: All must Dodge or take 1 damage.' },
];

let cardCounter = 0;
function createDeck() {
    let deck = [];
    CardPrototypes.forEach(proto => {
        for (let i = 0; i < proto.count; i++) {
            deck.push({ 
                id: cardCounter++, 
                name: proto.name, 
                type: proto.type, 
                effect: proto.effect 
            });
        }
    });
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// --- Game Engine Class ---
class AnimalFarmKill {
    constructor(playerNames) {
        this.players = [];
        this.playerNames = playerNames;
        this.deck = createDeck();
        this.discardPile = [];
        this.currentPlayerIndex = 0;
        this.isGameOver = false;
        this.currentPhase = 'Draw';
        this.attackPlayed = false; // Flag for Attack limit
        this.logElement = document.getElementById('game-status');
    }

    // Initialize players with roles and characters
    setupPlayers() {
        // Simple role assignment for a 4-player game (Tyrant, Loyalist, Rebel, Collaborator)
        const rolesToAssign = [ROLES.TYRANT, ROLES.LOYALIST, ROLES.REBEL, ROLES.COLLABORATOR];
        // Shuffle roles
        for (let i = rolesToAssign.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rolesToAssign[i], rolesToAssign[j]] = [rolesToAssign[j], rolesToAssign[i]];
        }
        
        this.players = this.playerNames.map((name, index) => {
            const character = Characters.find(c => c.name.startsWith(name.split(' ')[0]));
            return {
                id: index,
                name: name,
                role: rolesToAssign[index],
                character: character,
                health: character.health,
                maxHealth: character.health,
                hand: this.drawCard(4), // Start with 4 cards
                active: true, // Not eliminated
                skippedDraw: false, // For Seven Commandments
                skippedAttack: false, // For Boxer skill
            };
        });
    }

    startGame() {
        this.setupPlayers();
        this.renderGame();
        this.logMessage("Game started! Roles assigned.");
        this.startTurn();
    }

    logMessage(message) {
        console.log(message);
        this.logElement.textContent = `Game Log: ${message}`;
    }

    drawCard(count) {
        const drawnCards = [];
        for (let i = 0; i < count; i++) {
            if (this.deck.length === 0) {
                this.logMessage("Deck is empty. Shuffling discard pile.");
                this.deck = this.discardPile;
                this.discardPile = [];
                // Re-shuffle discarded cards
                for (let j = this.deck.length - 1; j > 0; j--) {
                    const k = Math.floor(Math.random() * (j + 1));
                    [this.deck[j], this.deck[k]] = [this.deck[k], this.deck[j]];
                }
            }
            if (this.deck.length > 0) {
                drawnCards.push(this.deck.pop());
            } else {
                break; // No cards left anywhere
            }
        }
        return drawnCards;
    }

    startTurn() {
        // Skip eliminated players
        while (!this.players[this.currentPlayerIndex].active) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        }

        const player = this.currentPlayer();
        this.attackPlayed = false;
        this.currentPhase = 'Draw';
        this.logMessage(`${player.name}'s turn begins. Role is ${player.role}.`);
        
        // --- 1. Draw Phase ---
        if (player.skippedDraw) {
            this.logMessage(`${player.name} skips the draw phase (Commandment).`);
            player.skippedDraw = false;
        } else {
            let cardsToDraw = 2;
            // Snowball Skill: Draw +1
            if (player.character.name === 'Snowball') cardsToDraw++;
            
            player.hand.push(...this.drawCard(cardsToDraw));
            this.logMessage(`${player.name} draws ${cardsToDraw} cards.`);
        }

        this.currentPhase = 'Action';
        document.getElementById('end-turn-button').disabled = false;
        this.renderGame();
    }

    endTurn() {
        const player = this.currentPlayer();
        this.currentPhase = 'Discard';

        // --- 3. Discard Phase ---
        if (player.hand.length > HAND_LIMIT) {
            // In a real game, you would prompt the user which cards to discard.
            // For this single-player simulation, we'll discard the first N cards.
            const excess = player.hand.length - HAND_LIMIT;
            const discarded = player.hand.splice(0, excess);
            this.discardPile.push(...discarded);
            this.logMessage(`${player.name} discarded ${excess} cards.`);
        }
        
        document.getElementById('end-turn-button').disabled = true;

        if (this.checkVictory()) return;

        // Advance turn
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.startTurn();
    }
    
    // Helper to get the current player object
    currentPlayer() {
        return this.players[this.currentPlayerIndex];
    }
    
    // --- Card Playing Logic (Simplified) ---
    handleCardPlay(cardId, targetId = null) {
        const player = this.currentPlayer();
        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;

        const card = player.hand[cardIndex];
        const target = targetId !== null ? this.players.find(p => p.id === targetId) : null;

        if (card.type === 'Attack' && this.attackPlayed && card.name === 'The Gun') {
             this.logMessage("You can only play one 'The Gun' attack per turn.");
             return;
        }

        // Remove card from hand and move to discard pile
        player.hand.splice(cardIndex, 1);
        this.discardPile.push(card);

        this.logMessage(`${player.name} plays ${card.name} ${target ? ' on ' + target.name : ''}.`);
        
        // Apply Card Effect
        switch (card.type) {
            case 'Attack':
                if (card.name === 'The Gun' && target) {
                    this.attackPlayed = true;
                    this.resolveAttack(player, target);
                } else if (card.name === "Old Major's Dream") {
                    this.resolveGlobalAttack(player);
                }
                break;
            case 'Health':
                player.health = Math.min(player.maxHealth, player.health + 1);
                this.logMessage(`${player.name} heals to ${player.health} HP.`);
                break;
            case 'Disruption':
                if (target) {
                    this.resolveDiscard(target, 2);
                }
                break;
            case 'Control':
                if (target) {
                    target.skippedDraw = true;
                    this.logMessage(`${target.name} will skip their next draw phase.`);
                }
                break;
            // Defense cards like 'Dodge' are only played reactively, not in the action phase.
        }

        this.checkElimination();
        this.checkVictory();
        this.renderGame();
    }

    // Resolves a single 'The Gun' attack
    resolveAttack(attacker, defender) {
        // In a real game, the defender would be prompted to play a 'Dodge'.
        // For simulation, we check if they have one.
        const dodgeIndex = defender.hand.findIndex(c => c.name === 'Dodge');
        if (dodgeIndex !== -1) {
            const dodgeCard = defender.hand.splice(dodgeIndex, 1)[0];
            this.discardPile.push(dodgeCard);
            this.logMessage(`${defender.name} played Dodge and avoided the attack.`);
        } else {
            defender.health -= 1;
            this.logMessage(`${defender.name} takes 1 damage. HP: ${defender.health}.`);
        }
    }
    
    // Resolves a global attack
    resolveGlobalAttack(attacker) {
        this.players.filter(p => p.id !== attacker.id && p.active).forEach(p => {
            const dodgeIndex = p.hand.findIndex(c => c.name === 'Dodge');
            if (dodgeIndex === -1) {
                p.health -= 1;
                this.logMessage(`${p.name} failed to Dodge the Dream and takes 1 damage. HP: ${p.health}.`);
            } else {
                const dodgeCard = p.hand.splice(dodgeIndex, 1)[0];
                this.discardPile.push(dodgeCard);
                this.logMessage(`${p.name} played Dodge and avoided the Dream.`);
            }
        });
    }
    
    // Resolves a Discard effect
    resolveDiscard(player, count) {
        const discarded = player.hand.splice(0, Math.min(count, player.hand.length));
        this.discardPile.push(...discarded);
        this.logMessage(`${player.name} was forced to discard ${discarded.length} cards.`);
    }

    checkElimination() {
        this.players.filter(p => p.active && p.health <= 0).forEach(p => {
            p.active = false;
            p.hand.forEach(c => this.discardPile.push(c)); // Discard entire hand
            p.hand = [];
            this.logMessage(`❌ ${p.name} (${p.role}) has been ELIMINATED!`);
        });
    }

    // --- Victory Condition Logic ---
    checkVictory() {
        const active = this.players.filter(p => p.active);
        const tyrant = active.find(p => p.role === ROLES.TYRANT);
        const rebels = active.filter(p => p.role === ROLES.REBEL);
        const collaborator = active.find(p => p.role === ROLES.COLLABORATOR);
        const loyalists = active.filter(p => p.role === ROLES.LOYALIST);

        // 1. Tyrant is Eliminated
        if (!tyrant) {
            this.isGameOver = true;
            this.logMessage("🎉 REBELS WIN! The Tyrant has fallen!");
            return true;
        }

        // 2. All Rebels/Collaborator are Eliminated (Tyrant/Loyalist Win)
        if (rebels.length === 0 && !collaborator) {
            this.isGameOver = true;
            this.logMessage("👑 TYRANT AND LOYALISTS WIN! All enemies of the Farm have been defeated!");
            return true;
        }
        
        // 3. Collaborator vs. Tyrant (Collaborator Objective)
        if (active.length === 2 && tyrant && collaborator) {
            // Collaborator wins by eliminating the Tyrant when only they are left
            // This case needs special in-game logic, but for simulation, we'll wait for the next attack.
            this.logMessage("⚠️ Collaborator vs. Tyrant Showdown!");
        }

        return false;
    }

    // --- Rendering and UI Logic ---
    renderGame() {
        const container = document.getElementById('players-container');
        container.innerHTML = '';
        const currentPlayer = this.currentPlayer();

        // Render Player Boards
        this.players.forEach(p => {
            const board = document.createElement('div');
            board.className = `player-board ${p.active ? '' : 'eliminated'} ${p.id === currentPlayer.id ? 'current-turn' : ''}`;
            board.id = `player-${p.id}`;
            board.onclick = () => this.handleTargetSelection(p.id);

            board.innerHTML = `
                <h3>${p.name}</h3>
                <p>Role: ${p.role} (${p.id === currentPlayer.id ? 'You' : 'Hidden'})</p>
                <p>Character: <strong>${p.character.name}</strong></p>
                <p>Health: ${p.health}/${p.maxHealth} ${p.active ? '❤️' : '💀'}</p>
                <p>Hand Size: ${p.id === currentPlayer.id ? p.hand.length : '?'}</p>
            `;
            container.appendChild(board);
        });

        // Render Current Player's Hand
        document.getElementById('player-name').textContent = currentPlayer.name;
        const handDiv = document.getElementById('current-hand');
        handDiv.innerHTML = '';
        currentPlayer.hand.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = `card ${card.type}`;
            cardDiv.title = card.effect;
            cardDiv.innerHTML = `
                <div class="card-name">${card.name}</div>
                <div>${card.type}</div>
            `;
            cardDiv.onclick = () => this.handleCardClick(card.id);
            handDiv.appendChild(cardDiv);
        });
    }

    // Logic for clicking a card in hand
    handleCardClick(cardId) {
        if (this.currentPhase !== 'Action' || this.isGameOver) return;
        
        const player = this.currentPlayer();
        const card = player.hand.find(c => c.id === cardId);

        if (!card) return;

        // Cards that require a target (Attack, Disruption, Control)
        if (['Attack', 'Disruption', 'Control'].includes(card.type)) {
            // Highlight targetable players and wait for second click
            this.logMessage(`Playing ${card.name}. Select a target.`);
            this.players.forEach(p => {
                const board = document.getElementById(`player-${p.id}`);
                if (p.active && p.id !== player.id) {
                    board.classList.add('targetable');
                }
            });
            // Store the card being played temporarily
            this.cardToPlay = cardId;
        } else {
            // Cards that don't need a target (Health, some Specials)
            this.handleCardPlay(cardId);
        }
    }

    // Logic for selecting a target player
    handleTargetSelection(targetId) {
        if (this.cardToPlay !== undefined) {
            // A card is waiting for a target
            this.handleCardPlay(this.cardToPlay, targetId);
            this.cardToPlay = undefined; // Clear the temporary card
            
            // Remove highlighting
            this.players.forEach(p => {
                document.getElementById(`player-${p.id}`).classList.remove('targetable');
            });
        }
    }
}