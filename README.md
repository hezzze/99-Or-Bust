### A practice program for professional 99-or-bust gamers

### ROAD MAP

#### iter 1
Quick and dirty implementation of the following:
- Game logic
- Server
- Basic game UI


#### Models (field name is asis)

```
//For client side
Opponent {
	idx: integer,
	userName: string,
	alive: boolean,
	nCards: integer
}
```

```
Card {
	rank: string,
	suit: string,
	isJoker: boolean
}
```

```
Player {
	idx: integer,
	userName: string,
	alive: boolean,
	cards: list of Card
}
```

#### Data schemas

server to client

```
State {
	me: player,
	opponents: list of Opponent,
	points: integer,
	direction: boolean,
	turnIdx: integer,
	turnName: string,
	gameOver: boolean,
	used: list of Card
}
```

client to server

```
Move Data {
	rank: string
	suit: string
	target: integer
	how {
		drawCardIdx: integer
		sub: boolean
	}
}
```	
	


#### iter 2
- validation
- UI
- Integration
