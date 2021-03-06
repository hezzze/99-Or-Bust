// Server code
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var _conns = [];

var N_PLAYERS = 3;

app.use("/js", express.static(__dirname + '/js'));
app.use("/imgs", express.static(__dirname + '/imgs'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {


    if (_conns.length < N_PLAYERS) {
        _conns.push(socket);
        if (_conns.length === N_PLAYERS) {
            startGame(_conns);
        }
    }

    console.log(socket.id);
    io.emit('server_update', socket.id + " connected\n");
});

var port = process.env.PORT || 3000
http.listen(port, function() {
    console.log('listening on *:' + port);
});


function startGame(sockets) {
    var deck = buildDeck();
    var players = [];
    sockets.forEach(function(socket) {
        players.push(new Player(socket.id))
    });

    for (var i = 0; i < 5; i++) {
        for (var j = 0; j < players.length; j++) {
            players[j].cards.push(deck.pop().toString());
        }
    }

    console.log("Game Started!!!!");

    var gameState = new State(deck, players);

    sockets.forEach(function(socket) {
        socket.emit("game_state", {
            msg: "Game Started!!! Hi, " + socket.id + "\n",
            state: gameState.getPlayerState(socket.id)
        });

        socket.on("client_move", function(data) {

            var target;
            for (var i = 0; i < players.length; i++) {
                if (data.targetPid === players[i].pid) {
                    target = players[i];
                    break;
                }
            }

            gameState.makeMove(gameState.getTurn(), new Card(data.rank, data.suit), target, data.how);

            socket.broadcast.emit("game_state", {
                msg: "Game state updated !!\n",
                state: gameState.getPlayerState(socket.id)
            });
        });

    });



}

// Constants
var RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "X", "J", "Q", "K"];

var RED_JOKER = "RJ",
    BLACK_JOKER = "BJ",
    CLUBS = "C",
    DIAMONDS = "D",
    HEARTS = "H",
    SPADES = "S";
var SUITS = [CLUBS, DIAMONDS, HEARTS, SPADES];


//Exceptions

var ILLEGAL_STATE = "Illegal state";
var GAME_OVER = "Game is Over";
var WRONG_TURN = "Wrong turn";
var CARD_NOT_FOUND = "Card not found";
var ILLEGAL_RANK_OR_SUIT = "Illegal rank or suit";
var ILLEGAL_PLAYER_ID = "Illegal player id";


//Helper 

Array.prototype.remove = function(from, to) {
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
};

Array.prototype.contains = function(elmt) {
    return this.indexOf(elmt) !== -1;
};

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]
//http://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array-in-javascript
Array.prototype.shuffle = function() {
    for (var j, x, i = this.length; i; j = Math.floor(Math.random() * i), x = this[--i], this[i] = this[j], this[j] = x);
    return this;
};


function State(unused, players, points) {
    var points = points || 0;
    var used = []; // Card
    var unused = unused || []; // Card
    var players = players || []; // Player
    var turn = players[0]; // Player
    var gameOver = false;
    var turnIdx = 0;
    var direction = true;

    if (!unused || !players || players.length <= 1) {
        throw ILLEGAL_STATE;
    }

    function nextTurn() {
        turnIdx = (turnIdx + (direction ? 1 : -1)) % players.length;
        if (turnIdx < 0) turnIdx = players.length - 1;
        while (!players[turnIdx].alive) {
            turnIdx = (turnIdx + (direction ? 1 : -1)) % players.length;
        }
        turn = players[turnIdx];
        if (points > 99) points = 99;
    }

    function setGameOver() {
        var liveCount = 0;
        for (var i in players) {
            if (players[i].alive) {
                liveCount++;
            }
        }

        gameOver = liveCount <= 1;
    }

    function getNextCard() {
        return unused.shift();
    }


    this.makeMove = function(player, card, target, how) {

        //TODO

        if (gameOver) {
            throw GAME_OVER;
        }


        //TODO
        //Add logic to prevent target to be player itself



        if (turn !== player) {
            throw WRONG_TURN;
        }



        var rank = card.rank;
        var move, canDraw = true;



        //######## USE CARD ########
        var idx = player.cards.indexOf(card.toString());

        if (idx === -1) {
            throw CARD_NOT_FOUND;
        } else {
            //remove the used card 
            player.cards.remove(idx);
        }




        //######## TAKE EFFECT ########

        switch (rank) {
            case "2":
            case "3":
            case "5":
            case "6":
            case "8":
            case "9":
                move = playNormal;
                break;
            case "A":
                move = playChooseNext;
                break;
            case "4":
                move = playReverse;
                break;
            case "7":
                move = playExchange;
                canDraw = false;
                break;
            case "X":
            case "Q":
                move = play1020;
                break;
            case "J":
                move = playDrawACard;
                canDraw = false;
                break;
            case "K":
                move = play99;
                break;
            case "BJ":
                move = playCurse;
                canDraw = false;
                break;
            case "RJ":
                move = playRevive;
                canDraw = false;
                break;
            default:
                throw ILLEGAL_RANK_OR_SUIT;
        }

        move(player, card, target, how);

        if (canDraw) {
            //draw a new card
            player.cards.push(getNextCard().toString());
        }

        //add used card to used pile
        used.push(card);


        //######## SUMMERIZE RESULTS ########

        if (points > 99) player.alive = false;

        players.forEach(function(p) {
            if (p.cards.length === 0) {
                p.alive = false;
            }
        });

        setGameOver();

        nextTurn();
    }

    function playNormal(player, card, target) {
        //assume rank can be parse to int
        points += parseInt(card.rank);
    }

    function playReverse(player, card, target) {
        direction = false;
    }

    function playExchange(player, card, target) {
        var cards = player.cards;
        player.cards = target.cards;
        target.cards = cards;
    }

    function playDrawACard(player, card, target, how) {
        var idx = how.drawCardIdx;
        var card = target.cards[idx];
        target.cards.remove(idx);

        player.cards.push(card);

    }

    function play1020(player, card, target, how) {
        var deltaPoints = card.rank === "X" ? 10 : 20;
        points += (how.sub ? -deltaPoints : deltaPoints);
    }

    function playRevive() {
        //TODO

    }

    function playCurse() {
        //TODO
    }

    this.getPlayers = function() {
        return players;
    }

    this.getPoints = function() {
        return points;
    }

    this.getTurn = function() {
        return turn;
    }

    this.getPlayerState = function(pid) {
        var me;
        var opponents = [];
        for (var i = 0; i < players.length; i++) {
            p = players[i];
            if (p.pid === pid) {
                me = p;
            } else {
                opponents.push(new Opponent(p.pid, p.cards.length, p.alive));
            }
        }


        var state = {
            me: me,
            opponents: opponents,
            points: points,
            direction: direction,
            turnId: turn.pid,
            gameOver: gameOver,
            used: used
        };

        return state;

    }

}


function Opponent(pid, ncard, alive) {
    this.numOfCard = ncard;
    this.alive = alive;
    this.pid = pid;;
}

function buildDeck() {
    var deck = [];
    for (var i = 0; i < RANKS.length; i++) {
        for (var j = 0; j < SUITS.length; j++) {
            deck.push(new Card(RANKS[i], SUITS[j]));
        }
    }
    deck.push(new Card(BLACK_JOKER));
    deck.push(new Card(RED_JOKER));
    return deck.shuffle();
}


function Card(rank, suit) {

    this.rank = rank;
    this.suit = suit;
    this.isJoker = false;

    if (!RANKS.contains(rank) || !SUITS.contains(suit)) {
        if (rank != RED_JOKER && rank != BLACK_JOKER) {
            throw ILLEGAL_RANK_OR_SUIT;
        } else {
            this.isJoker = true;
        }
    }

    this.toString = function() {
        return this.isJoker ? this.rank : this.rank + this.suit;
    }
}

function Player(pid, cards) {
    if (!pid) {
        throw ILLEGAL_PLAYER_ID;
    }

    this.pid = pid || "";
    this.cards = cards || [];
    this.alive = true;
}


//Tests

function checkException(n, exception, f) {
    try {
        f();
    } catch (e) {
        if (e !== exception) {
            console.log("Expected: " + exception + "\n" + "Actual: " + e);
            throw "Test " + n + " failed";
        }
    }
}

function assert(n, cond) {
    if (!cond) {
        throw "Test " + n + " failed";
    }
}

function getNewTestState(points) {
    var deck = buildDeck();
    var players = [];
    ["P1", "P2", "P3", "P4"].forEach(function(pid) {
        players.push(new Player(pid))
    });

    for (var i = 0; i < 5; i++) {
        for (var j = 0; j < players.length; j++) {
            players[j].cards.push(deck.pop().toString());
        }
    }

    return new State(deck, players, points);

}

function test1() {

    var testState = getNewTestState();


    checkException(1, WRONG_TURN, function() {
        testState.makeMove(testState.getPlayers()[1], new Card("A", HEARTS));
    });
}

function test2() {

    var testState = getNewTestState();

    var players = testState.getPlayers();

    players[0].cards = ["AH"];


    checkException(2, CARD_NOT_FOUND, function() {
        testState.makeMove(players[0], new Card("A", CLUBS));
    });
}

function test3() {

    var testState = getNewTestState();

    var players = testState.getPlayers();

    players[0].cards = ["3S"];

    testState.makeMove(players[0], new Card("3", SPADES));
    assert(3, testState.getPoints() === 3);
    assert(3, testState.getTurn() === players[1]);
}

function test4() {
    var testState = getNewTestState(99);

    var players = testState.getPlayers();

    players[0].cards = ["3S"];

    testState.makeMove(players[0], new Card("3", SPADES));

    assert(4, players[0].alive === false);
    assert(4, testState.getPoints() === 99);

}

function test5() {
    var testState = getNewTestState(99);

    var players = testState.getPlayers();

    players[0].cards = ["4S"];

    testState.makeMove(players[0], new Card("4", SPADES));

    assert(5, testState.getTurn() === players[3]);

}




function runTest() {
    var tests = [test1, test2, test3, test4, test5];
    tests.forEach(function(t) {
        t();
    });
}

runTest();

// 10 +10/-10
// Q +20/-20
// K raise to 99
// 4 reverse
// 7 exchange cards
// J draw a card from somebody
// red joker, revive
// black joker, curse
