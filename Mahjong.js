class Tile {
	static WIDTH = 50;
	static HEIGHT = 75;
	static Z_SHIFT = 10;
	
	static MARGIN = 3;
	
	static sourceForID = [
		"Bamboo-1.png",
		"Bamboo-2.png",
		"Bamboo-3.png",
		"Bamboo-4.png",
		"Bamboo-5.png",
		"Bamboo-6.png",
		"Bamboo-7.png",
		"Bamboo-8.png",
		"Bamboo-9.png",
		"Circle-1.png",
		"Circle-2.png",
		"Circle-3.png",
		"Circle-4.png",
		"Circle-5.png",
		"Circle-6.png",
		"Circle-7.png",
		"Circle-8.png",
		"Circle-9.png",
		"Number-1.png",
		"Number-2.png",
		"Number-3.png",
		"Number-4.png",
		"Number-5.png",
		"Number-6.png",
		"Number-7.png",
		"Number-8.png",
		"Number-9.png",
		"Dragon-Blank.png",
		"Dragon-Green.png",
		"Dragon-Red.png",
		//"Flower-Bamboo.png",
		"Flower-Chrysanthemum.png",
		//"Flower-Orchid.png",
		//"Flower-Plum.png",
		"Season-Autumn.png",
		//"Season-Spring.png",
		//"Season-Summer.png",
		//"Season-Winter.png",
		"Wind-East.png",
		"Wind-North.png",
		"Wind-South.png",
		"Wind-West.png",
	];
	
	highlighted = false;
	hinted = false;
	id = 0;
	fadeoutBegan = false;
	element = null;
	
	x;
	y;
	z;
	
	game;
	
	constructor(game, id, parentElement, clickHandler) {
		this.game = game;
		this.element = document.createElement('img');
		this.element.className = 'tile';
		this.element.style.height = `${Tile.HEIGHT}px`;
		this.element.style.width = `${Tile.WIDTH}px`;
		this.element.addEventListener('click', (event) => {
			game.cell_click(this.x, this.y, this.z);
		});
		parentElement.appendChild(this.element);
		this.resetID(id);
	}
	
	resetID(newID) {
		this.id = newID;
		this.element.style.backgroundImage = `url(tiles/${Tile.sourceForID[newID]})`;
	}
	
	beginFadeout() {
		this.fadeoutBegan = true;
		this.element.style.transition = 'opacity 0.5s ease-out'; // Apply transition effect
		this.element.style.opacity = '0'; // Set final opacity to trigger fade-out
		
		// Remove the element from the DOM after the transition ends
		this.element.addEventListener('transitionend', () => this.element.remove());
	}
	
	setHighlighted(newValue) {
		this.highlighted = newValue;
		if (newValue) {
			this.element.classList.add('highlighted');
		} else {
			this.element.classList.remove('highlighted');
		}
	}
	
	toggleHighlighted() {
		this.setHighlighted(!this.highlighted);
	}
	
	setHinted(newValue) {
		this.hinted = newValue;
		if (newValue) {
			this.element.classList.add('hinted');
		} else {
			this.element.classList.remove('hinted');
		}
	}
	
	setClickable(newValue) {
		if (newValue) {
			this.element.classList.remove('disabled');
		} else {
			this.element.classList.add('disabled');
		}
	}
	
	reposition(x, y, z) {
		[this.x, this.y, this.z] = [x, y, z];
		const perspectiveZ = z * Tile.Z_SHIFT;
		const drawX = perspectiveZ + x * (Tile.WIDTH + Tile.MARGIN) / 2;
		const drawY = -perspectiveZ + (MahjongLayout.GRID_EXTENT_Y-y) * (Tile.HEIGHT + Tile.MARGIN) / 2;
		this.element.style.top = `${drawY}px`;
		this.element.style.left = `${drawX}px`;
		this.element.style.zIndex = z;
	}
	
	compare_id(other) {
		return this.id == other.id;
	}
}

class MahjongLayout {
	static GRID_EXTENT_X = 16*2;
	static GRID_EXTENT_Y = 10*2;
	static GRID_EXTENT_Z = 9;
	
	cell_matrix = [];
	name;
	
	constructor(url, game) {
		this.initialize(url)
			.then(() => {
				game.loadingComplete(this);
			})
			.catch(error => {
				console.error('Initialization failed:', error);
			});
	}
	
	async initialize(url) {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error("Network failure: ${response.statusText}");
		}
		
		const arrayBuffer = await response.arrayBuffer();
		const dataView = new DataView(arrayBuffer);
		
		const version = dataView.getUint8(0);
		
		const LATEST_VERSION = 1;
		if (version>LATEST_VERSION) {
			throw new Error("Version too recent");
		}
		
		let extent_x, extent_y, extent_z;
		if (version==0) {
			extent_x = 16*2;
			extent_y = 9*2;
			extent_z = 9;
		} else {
			extent_x = MahjongLayout.GRID_EXTENT_X;
			extent_y = MahjongLayout.GRID_EXTENT_Y;
			extent_z = MahjongLayout.GRID_EXTENT_Z;
		}
		this.cell_matrix = Array.from({ length: MahjongLayout.GRID_EXTENT_X }, () => 
			Array.from({ length: MahjongLayout.GRID_EXTENT_Y }, () => 
				Array(MahjongLayout.GRID_EXTENT_Z).fill(false)
			)
		);
		let index = 1;
		for (let x=0; x<extent_x; ++x) {
			for (let y=0; y<extent_y; ++y) {
				for (let z=0; z<extent_z; ++z) {
					this.cell_matrix[x][y][z] = dataView.getUint8(index) !== 0;
					index += 1;
				}
			}
		}
		
		let name = url.split('/').pop();
		name = name.substring(0, name.lastIndexOf("."));
		this.name = name.replace(/\b\w/g, char => char.toUpperCase());
	}
}

class Mahjong {
	static WIN_CAPTION = "Victory! New game with layout…";
	static LOSE_CAPTION = "Defeated, no more moves! New game with layout…";
	
	static TILES_DO_NOT_MATCH = "Tiles do not match";
	static TILE_IS_BLOCKED = "Tile is blocked";
	static CLICK_THE_FLASHING_TILES = "Click the flashing tiles";
	static NO_MORE_HINTS_THIS_GAME = "No more hints this game";
	static NO_MORE_SHUFFLES_THIS_GAME = "No more shuffles this game";
	static NO_MOVES_REMAINING_TRY_SHUFFLE = "No moves remaining, use a shuffle to continue.";
	static HELP_BASIC = "Connect matching tiles. Both tiles must be clear on the left or right.";
	
	cells = [];
	remaining_hints = 5;
	remaining_shuffles = 10;
	
	selected_cell = null;
	
	gameContainerElement = null;
	
	hintButton = null;
	shuffleButton = null;
	
	remainingCountLabel = null;
	
	messagesLabel = null;
	
	overlayCanvas = null;
	gameOverContainer = null;
	gameOverMessage = null;
	
	constructor(layoutURL, gameContainerElement) {
		const extra = MahjongLayout.GRID_EXTENT_Z / 4;
		const displayWidth = (Tile.WIDTH+Tile.MARGIN) * (MahjongLayout.GRID_EXTENT_X/2 + extra);
		const displayHeight = (Tile.HEIGHT+Tile.MARGIN) * (MahjongLayout.GRID_EXTENT_Y/2 + extra);
		this.gameContainerElement = gameContainerElement;
		this.gameContainerElement.style.height = `${displayHeight}px`;
		this.gameContainerElement.style.width = `${displayWidth}px`;
		this.gameContainerElement.innerText = "";
		
		this.cells = Array.from({ length: MahjongLayout.GRID_EXTENT_X }, () => 
			Array.from({ length: MahjongLayout.GRID_EXTENT_Y }, () => 
				Array(MahjongLayout.GRID_EXTENT_Z).fill(null)
			)
		);
		let layout = new MahjongLayout(layoutURL, this);
	}
	
	loadingComplete(layout) {
		let i = 0;
		const MAX = 144;
		for (let x=0; x<MahjongLayout.GRID_EXTENT_X && i<MAX; ++x) {
			for (let y=0; y<MahjongLayout.GRID_EXTENT_Y && i<MAX; ++y) {
				for (let z=0; z<MahjongLayout.GRID_EXTENT_Z && i<MAX; ++z) {
					if (layout.cell_matrix[x][y][z]) {
						this.cells[x][y][z] = new Tile(this, Math.floor(i/4), this.gameContainerElement);
						++i;
					}
				}
			}
		}
		let MIN_MATCHING_PAIRS=3;
		let initial_matching_pair_count = 0;
		do {
			this.do_shuffle();
			initial_matching_pair_count = this.remainingMoveCount();
		} while (initial_matching_pair_count<MIN_MATCHING_PAIRS);
		this.repositionAllTiles();
		this.updateUI();
	}
	
	repositionAllTiles() {
		for (let x=0; x<MahjongLayout.GRID_EXTENT_X; ++x) {
			for (let y=0; y<MahjongLayout.GRID_EXTENT_Y; ++y) {
				for (let z=0; z<MahjongLayout.GRID_EXTENT_Z; ++z) {
					if (this.cell_exists(x, y, z)) {
						this.cells[x][y][z].reposition(x, y, z);
						const isClickable = !this.cell_is_blocked(x, y, z);
						this.cells[x][y][z].setClickable(isClickable);
					}
				}
			}
		}
	}
	
	parityTest() {
		let counts = {};
		for (let x=0; x<MahjongLayout.GRID_EXTENT_X; ++x) {
			for (let y=0; y<MahjongLayout.GRID_EXTENT_Y; ++y) {
				for (let z=0; z<MahjongLayout.GRID_EXTENT_Z; ++z) {
					if (this.cell_exists(x, y, z)) {
						let c = this.cells[x][y][z];
						if (counts[c.id] == undefined) {
							counts[c.id] = 1;
						} else {
							counts[c.id] = counts[c.id] + 1;
						}
					}
				}
			}
		}
		console.log(counts);
	}
	
	updateUI() {
		this.hintButton.innerText = `Hints: ${this.remaining_hints}`;
		this.shuffleButton.innerText = `Shuffles: ${this.remaining_shuffles}`;
		this.remainingCountLabel.innerText = `Available moves: ${this.remainingMoveCount()}, remaining tiles: ${this.count_remaining_tiles()}`;
		this.post_message(Mahjong.HELP_BASIC);
		
		//this.parityTest(); // Debug info
	}
	
	post_message(message) {
		if (this.messagesLabel == null) {
			alert(message);
		} else {
			this.messagesLabel.innerText = message;
		}
	}
	
	configureShuffleButton(element) {
		this.shuffleButton = element;
		this.shuffleButton.addEventListener('click', () => {
			this.shuffle();
		});
	}
	
	shuffle() {
		if (this.remaining_shuffles<=0) {
			this.post_message(Mahjong.Mahjong.NO_MORE_SHUFFLES_THIS_GAME);
			return;
		}
		this.remaining_shuffles--;
		let tries=0;
		const MAX_TRIES = 200;
		do {
			this.do_shuffle();
			++tries;
		} while (this.remainingMoveCount()==0 && tries<MAX_TRIES);
		this.updateUI();
	}
	
	do_shuffle() {
		let unshuffledTiles = new Array(144);
		let tile_count = 0;
		
		for (let x=0; x<MahjongLayout.GRID_EXTENT_X; ++x) {
			for (let y=0; y<MahjongLayout.GRID_EXTENT_Y; ++y) {
				for (let z=0; z<MahjongLayout.GRID_EXTENT_Z; ++z) {
					if (this.cell_exists(x, y, z)) {
						let t = this.cells[x][y][z];
						t.setHighlighted(false);
						t.setHinted(false);
						unshuffledTiles[tile_count] = t.id;
						tile_count++;
					}
				}
			}
		}
		
		var shuffledTiles = unshuffledTiles
			.slice(0, tile_count)
			.map(value => ({ value, sort: Math.random() }))
			.sort((a, b) => a.sort - b.sort)
			.map(({ value }) => value);
		
		tile_count = 0;
		for (let x=0; x<MahjongLayout.GRID_EXTENT_X; ++x) {
			for (let y=0; y<MahjongLayout.GRID_EXTENT_Y; ++y) {
				for (let z=0; z<MahjongLayout.GRID_EXTENT_Z; ++z) {
					if (this.cell_exists(x, y, z)) {
						let t = this.cells[x][y][z]; 
						t.resetID(shuffledTiles[tile_count]);
						if (++tile_count>shuffledTiles.length) {
							return;
						}
					}
				}
			}
		}
	}
	
	configureHintButton(element) {
		this.hintButton = element;
		this.hintButton.addEventListener('click', () => {
			this.hint();
		});
	}
	
	hint() {
		if (this.remaining_hints<=0) {
			this.post_message(Mahjong.NO_MORE_HINTS_THIS_GAME);
			return;
		}
		
		let x1, y1, z1, x2, y2, z2;
		
		if (this.remainingMoveCount()==0) {
			this.post_message(Mahjong.NO_MOVES_REMAINING_TRY_SHUFFLE);
		}
		else if (this.there_are_hinted_tiles()) {
			this.post_message(Mahjong.CLICK_THE_FLASHING_TILES);
		}
		else {
			this.remaining_hints--;
			for (x1=0; x1<MahjongLayout.GRID_EXTENT_X; x1++) {
				for (y1=0; y1<MahjongLayout.GRID_EXTENT_Y; y1++) {
					for (z1=0; z1<MahjongLayout.GRID_EXTENT_Z; z1++) {
						
						if (this.cell_exists(x1, y1, z1)) {
							let tile_1 = this.cells[x1][y1][z1];
							
							for (x2=0; x2<MahjongLayout.GRID_EXTENT_X; x2++) {
								for (y2=0; y2<MahjongLayout.GRID_EXTENT_Y; y2++) {
									for (z2=0; z2<MahjongLayout.GRID_EXTENT_Z; z2++) {
										let tile_2 = this.cells[x2][y2][z2];
										if (this.cell_exists(x2, y2, z2) && tile_1.compare_id(tile_2)) {
											if (this.can_remove_pair(x1, y1, z1, x2, y2, z2)) {
												tile_1.setHinted(true);
												tile_2.setHinted(true);
												this.post_message(Mahjong.CLICK_THE_FLASHING_TILES);
												x1 = x2 = MahjongLayout.GRID_EXTENT_X;
												y1 = y2 = MahjongLayout.GRID_EXTENT_Y;
												this.updateUI();
												return;
											}
										}
									}
								}
							}
							
						}
						
					}
				}
			}
		}
	}

	there_are_hinted_tiles() {
		for (let x=0; x<MahjongLayout.GRID_EXTENT_X; x++) {
			for (let y=0; y<MahjongLayout.GRID_EXTENT_Y; y++) {
				for (let z=0; z<MahjongLayout.GRID_EXTENT_Z; z++) {
					if (this.cell_exists(x, y, z) && this.cells[x][y][z].hinted) return true;
				}
			}
		}
		return false;
	}
	
	game_over(won) {
		this.selectLevelWithMessage( won ? Mahjong.WIN_CAPTION : Mahjong.LOSE_CAPTION );
	}
	
	selectLevelWithMessage(message) {
		this.gameOverMessage.innerText = message;
		this.gameOverContainer.classList.add('visible');
	}
	
	cell_click(x_in, y_in, z_in) {
		if (this.cell_is_blocked(x_in, y_in, z_in)) return;
		
		if (x_in>=0 && y_in>=0 && x_in<MahjongLayout.GRID_EXTENT_X && y_in<MahjongLayout.GRID_EXTENT_Y && this.cell_exists(x_in, y_in, z_in)) {
			if (1==this.selected_cell_count()) { // If one is already selected before this click
				if (this.cells[x_in][y_in][z_in] == this.selected_cell) { // The one already selected was this one
					this.cells[x_in][y_in][z_in].toggleHighlighted();
					if (!this.selected_cell.highlighted) {
						this.selected_cell = null;
					}
				}
				else if (!this.cell_is_blocked(x_in, y_in, z_in)) {
					if (this.cells[x_in][y_in][z_in].compare_id(this.selected_cell)) {
						this.cells[x_in][y_in][z_in].setHighlighted(true);
						this.try_to_remove_cell_pair();
						if (this.cell_exists(x_in, y_in, z_in)) { // Remove failed
							this.cells[x_in][y_in][z_in].setHighlighted(false);
						}
					}
					else {
						// Tiles do not match
						this.post_message(Mahjong.TILES_DO_NOT_MATCH);
					}
				}
				else {
					this.post_message(Mahjong.TILE_IS_BLOCKED);
				}
			}
			else if (0==this.selected_cell_count()) { // If nothing is already selected
				if (!this.cell_is_blocked(x_in, y_in, z_in)) {
					this.selected_cell = this.cells[x_in][y_in][z_in];
					this.selected_cell.setHighlighted(true);
				}
				else {
					this.post_message(Mahjong.TILE_IS_BLOCKED);
				}
			}
			this.do_endgame_check();
		}
		else {
			// This probably shouldn't ever occur... but if it does, I think it means there was no cell at that location.
		}
	}
	
	do_endgame_check() {
		if (this.count_remaining_tiles()==0) {
			this.game_over(true);
		}
		else if (0==this.remainingMoveCount() && 0==this.remaining_shuffles) {
			this.game_over(false);
		}
	}
	
	remainingMoveCount() {
		let result = 0;
		
		for (let fromX=0; fromX<MahjongLayout.GRID_EXTENT_X; ++fromX) {
			for (let fromY=0; fromY<MahjongLayout.GRID_EXTENT_Y; ++fromY) {
				for (let fromZ=0; fromZ<MahjongLayout.GRID_EXTENT_Z; ++fromZ) {
					
					if (this.cell_exists(fromX, fromY, fromZ)) {
						let from = this.cells[fromX][fromY][fromZ];
						
						for (let toX=0; toX<MahjongLayout.GRID_EXTENT_X; ++toX) {
							for (let toY=0; toY<MahjongLayout.GRID_EXTENT_Y; ++toY) {
								for (let toZ=0; toZ<MahjongLayout.GRID_EXTENT_Z; ++toZ) {
								
									if (	(fromX!=toX || fromY!=toY || fromZ!=toZ) &&
											 this.cell_exists(toX, toY, toZ) &&
											this.cells[toX][toY][toZ].compare_id(from)) {
										if (this.can_remove_pair(fromX, fromY, fromZ, toX, toY, toZ)) {
											++result;
										}
									}
								}
							}
						}
						
					}
					
				}
			}
		}
		
		return result/2; // Need to /2 because it counts a->b and b->a as unique
	}
	
	count_remaining_tiles() {
		let count=0;
		
		for (let x=0; x<MahjongLayout.GRID_EXTENT_X; ++x) {
			for (let y=0; y<MahjongLayout.GRID_EXTENT_Y; ++y) {
				for (let z=0; z<MahjongLayout.GRID_EXTENT_Z; ++z) {
					if (this.cell_exists(x, y, z)) ++count;
				}
			}
		}
		return count;
	}
	
	cell_exists(x, y, z) {
		return this.cells[x][y][z]!=null && this.cells[x][y][z].fadeoutBegan == false;
	}
	
	try_to_remove_cell_pair() {
		let x1, y1, z1, x2, y2, z2;
		let someCellsRemovedFlag = false;
		
		x1 = -1;
		x2 = -1;
		y1 = -1;
		y2 = -1;
		z1 = -1;
		z2 = -1;
		
		for (let x=0; x<MahjongLayout.GRID_EXTENT_X; ++x) {
			for (let y=0; y<MahjongLayout.GRID_EXTENT_Y; ++y) {
				for (let z=0; z<MahjongLayout.GRID_EXTENT_Z; ++z) {
					if (this.cell_exists(x, y, z) && this.cells[x][y][z].highlighted) {
						if (x1<0) {
							x1 = x;
							y1 = y;
							z1 = z;
						}
						else {
							x2 = x;
							y2 = y;
							z2 = z;
						}
					}
				}
			}
		}
		
		if (this.can_remove_pair(x1, y1, z1, x2, y2, z2)) {
			
			for (let x=0; x<MahjongLayout.GRID_EXTENT_X; ++x) {
				for (let y=0; y<MahjongLayout.GRID_EXTENT_Y; ++y) {
					for (let z=0; z<MahjongLayout.GRID_EXTENT_Z; ++z) {
						if (this.cell_exists(x, y, z) && this.cells[x][y][z].highlighted) {
							this.cells[x][y][z].beginFadeout();
							this.cell_removed(x, y, z);
							someCellsRemovedFlag = true;
						}
					}
				}
			}
		}
		
		if (someCellsRemovedFlag) {
			this.some_cells_removed(true);
		}
	}
	
	can_remove_pair(x1, y1, z1, x2, y2, z2) {
		if (!this.cell_exists(x1, y1, z1) || !this.cell_exists(x2, y2, z2)) {
			return false;
		}
		let t1 = this.cells[x1][y1][z1];
		let t2 = this.cells[x2][y2][z2];
		if (x1==x2 && y1==y2 && z1==z2) {
			return false;
		}
		if (!t1.compare_id(t2)) {
			return false;
		}
		if (this.cell_is_blocked(x1, y1, z1)) {
			return false;
		}
		if (this.cell_is_blocked(x2, y2, z2)) {
			return false;
		}
		return true;
	}
	
	cell_is_blocked(x, y, z) {
		let min_y = y-1, max_y = y+1;
		let min_x = x-2, max_x = x+2;
		if (min_y<0) min_y = 0;
		if (max_y>=MahjongLayout.GRID_EXTENT_Y) min_y = MahjongLayout.GRID_EXTENT_Y-1;
		// Check left
		let blocked_left = false;
		if (min_x>=0) {
			for (let yp=min_y; yp<=max_y && !blocked_left; ++yp) {
				if (this.cell_exists(min_x, yp, z)) blocked_left = true;
			}
		}
		else min_x=0;
		// Check right
		if (max_x<MahjongLayout.GRID_EXTENT_X) {
			for (let yp=min_y; yp<=max_y; ++yp) {
				if (this.cell_exists(max_x, yp, z) && blocked_left) return true;
			}
		}
		else max_x=MahjongLayout.GRID_EXTENT_X-1;
		// Check up
		z++;
		min_x = x-1; if (min_x<0) min_x=0;
		max_x = x+2; if (max_x>=MahjongLayout.GRID_EXTENT_X) max_x=MahjongLayout.GRID_EXTENT_X-1;
		if (z<MahjongLayout.GRID_EXTENT_Z) {
			for (let xp=min_x; xp<max_x; ++xp) {
				for (let yp=min_y; yp<=max_y; ++yp) {
					if (this.cell_exists(xp, yp, z)) return true;
				}
			}
		}
		// No block found!
		return false;
	}
	
	some_cells_removed() {
		this.selected_cell = null;
		this.repositionAllTiles();
		this.do_endgame_check();
		this.updateUI();
	}
	
	cell_removed(cell_x, cell_y, cell_z) {
	}
	
	selected_cell_count() {
		let result = 0;
		
		for (let z=0; z<MahjongLayout.GRID_EXTENT_Z; ++z) {
			for (let y=0; y<MahjongLayout.GRID_EXTENT_Y; ++y) {
				for (let x=0; x<MahjongLayout.GRID_EXTENT_X; ++x) {
					if (this.cell_exists(x, y, z) && this.cells[x][y][z].highlighted) ++result;
				}
			}
		}
		return result;
	}
}

