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
	pid: string,
	alive: boolean,
	numOfCard: integer
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
	pid: string,
	alive: boolean,
	cards: list of Card
}
```


#### iter 2
- validation
- UI
- Integration
