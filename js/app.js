angular.module('99App', []);

(function() {

    var CARD_W = 68,
        CARD_H = 96,
        N_OF_CARDS = 55;

    var _stage, _w, _h, _assetLoader, _socket;

    var _selectedCode = null,
        _targetPid = null,
        _canSelectTarget = false,
        _selectedTarget = null,  // OpponentContainer
        _isSub = true,
        _plusOrMinusUi;


    function init() {

        _stage = new createjs.Stage("game_canvas");

        manifest = [{
            src: "CardDeck2.png",
            id: "poker_cards"
        }, {
            src: "ok_up_thumb.png",
            id: "ok_btn"
        }];


        _w = _stage.canvas.width;
        _h = _stage.canvas.height;

        _assetLoader = new createjs.LoadQueue(false);
        _assetLoader.addEventListener("complete", handleComplete);
        _assetLoader.loadManifest(manifest, true, "../imgs/");
    }



    function OpponentsPanel(cardsImg, opponents) {

        this.ui = new createjs.Container();

        var x = 0;

        var thisUi = this.ui;

        opponents.forEach(function(op) {
        	var opCont = new OpponentContainer(cardsImg, op);
        	opCont.ui.x = x;
        	x += opCont.ui.getBounds().width + 10;
        	opCont.ui.addEventListener("click", function() {
        		if (_canSelectTarget) {
        			if (!_selectedTarget) {
        				_selectedTarget = opCont;
        				_targetPid = opCont.pid;
        				opCont.border.visible = true;
        			} else {
        				if (opCont !== _selectedTarget) {
        					_selectedTarget.border.visible = false;
        					_selectedTarget = opCont;
        					_targetPid = opCont.pid;
        					opCont.border.visible = true;
        				}
        			}
        		}
        	});

        	thisUi.addChild(opCont.ui);
        })

    }

    // called after the user selected a card
    function moreOptions() {

        var rank;

        if (_selectedCode === "RJ" || _selectedCode === "BJ") {
            rank = _selectedCode;
        } else {
            rank = _selectedCode[0];
        }

        switch (rank) {
            case "A":
            case "7":
            case "J":
            case "BJ":
            case "RJ":
                _canSelectTarget = true;
               	_plusOrMinusUi.visible = false;
                break;
            case "X":
            case "Q":
            	_canSelectTarget = false;
            	_plusOrMinusUi.visible = true;
                break;
            default:
            	_canSelectTarget = false;
            	_plusOrMinusUi.visible = false;
        }
    }


    function OpponentContainer(cardsImg, opponent) {

        this.ui = new createjs.Container();
        this.pid = opponent.pid;
        

        var card = new createjs.Bitmap(cardsImg);

        var sprite = new createjs.SpriteSheet({
            "images": [cardsImg],
            frames: {
                width: CARD_W,
                height: CARD_H,
                count: N_OF_CARDS,
                regX: 0,
                regY: 0
            }
        });

        // get the sprite frame of the back of a card
        card.sourceRect = sprite.getFrame(52).rect;

        card.setTransform(0, 0, 0.5, 0.5);

        var text = "Id: " + opponent.pid + "\nCards: " + opponent.numOfCard + "\nStatus:" + (opponent.alive ? "alive" : "dead");

        var textUi = new createjs.Text(text, "14px Arial", "#39A715");
        textUi.setTransform(card.getBounds().width / 2, 0);

        this.ui.addChild(card);
        this.ui.addChild(textUi);

        var bounds = this.ui.getBounds();
        var border = new createjs.Shape();
        border.graphics.beginStroke("#ff0000").drawRect(0,0,bounds.width,bounds.height);

        border.visible = false;
        this.ui.addChild(border);

        this.border = border;

    }



    function PlayerPanel(cardsImg, btnImg, handCodes, isMyTurn) {


        var selectedCard = null;
        this.ui = new createjs.Container();
        var handUi = new createjs.Container();
        var button = new createjs.Bitmap(btnImg);


        var sprite = new createjs.SpriteSheet({
            "images": [cardsImg],
            frames: {
                width: CARD_W,
                height: CARD_H,
                count: N_OF_CARDS,
                regX: 0,
                regY: 0
            }
        });


        function renderCard(code, pos) {
            var card = new createjs.Bitmap(cardsImg);
            card.sourceRect = sprite.getFrame(cardCodeToFrameIndex(code)).rect;
            card.setTransform(pos[0], pos[1]);

            if (isMyTurn)
                card.addEventListener("click", function(e) {
                    if (!selectedCard) {
                        selectedCard = card;
                        _selectedCode = code;
                        card.y -= 30;
                        button.visible = true;

                        moreOptions();

                    } else {
                        selectedCard.y += 30;
                        if (card !== selectedCard) {
                            selectedCard = card;
                            _selectedCode = code;
                            card.y -= 30;

                        } else {
                            selectedCard = null;
                            _selectedCode = null;
                            button.visible = false;
                            _canSelectTarget = false;
                        }
                    }
                });

            return card;

        }

        for (var i = 0; i < handCodes.length; i++) {
            var card = renderCard(handCodes[i], [i * 0.3 * CARD_W, 0]);
            handUi.addChild(card);
        }

        button.setTransform(handUi.getBounds().width + 30, handUi.getBounds().height / 2 - button.getBounds().height / 2, 0.5, 0.5);

        button.visible = false;

        button.addEventListener("click", function() {
            if (selectedCard) {
                console.log("You played " + _selectedCode + " !");
                var data = {};
                if (_selectedCode === "RJ" || _selectedCode === "BJ") {
                    data.rank = _selectedCode;
                } else {
                    data.rank = _selectedCode[0];
                    data.suit = _selectedCode[1];
                }

                data.targetPid = _targetPid;
                data.how = {
                	sub: _isSub,
                	drawCardIndex: 0
                };

                console.log(data);

                _socket.emit('client_move', data);
            }
            handUi.removeChild(selectedCard);
            button.visible = false;
        });

        this.ui.addChild(handUi);
        this.ui.addChild(button);

        var bounds = this.ui.getBounds();

        this.ui.x = _w / 2 - bounds.width / 2;
        this.ui.y = _h - bounds.height;

    }


    function cardCodeToFrameIndex(str) {

        var suitToIdx = {
            C: 0,
            S: 1,
            D: 2,
            H: 3
        };
        var rankToIdx = {
            A: 0,
            K: 1,
            Q: 2,
            J: 3,
            "X": 4,
            "9": 5,
            "8": 6,
            "7": 7,
            "6": 8,
            "5": 9,
            "4": 10,
            "3": 11,
            "2": 12
        };

        switch (str) {
            case "RJ":
                return 53;
            case "BJ":
                return 54;
            default:
                return rankToIdx[str[0]] + suitToIdx[str[1]] * 13;
        }

    }

    function handleComplete() {

        _socket = io();

        _socket.on('server_update', function(msg) {
            var val = $('#server_update').val();
            $('#server_update').val(val + msg);
        });

        _socket.on('game_state', function(data) {

            var val = $('#server_update').val();

            $('#server_update').val(val + data.msg);

            console.log(data.state);

            updateState(data.state);

        });


        createjs.Ticker.timingMode = createjs.Ticker.RAF;
        createjs.Ticker.addEventListener("tick", tick);

    }

    function updateState(state) {

        _stage.removeAllChildren();

        var playerPanel = new PlayerPanel(_assetLoader.getResult("poker_cards"), _assetLoader.getResult("ok_btn"), state.me.cards, state.turnId === state.me.pid);

        

        var opponentsPanel = new OpponentsPanel(_assetLoader.getResult("poker_cards"), state.opponents);


        _plusOrMinusUi = new createjs.Container();

    	var plus = new createjs.Text("+", "36px Arial", "#405261");
    	var minus = new createjs.Text("-", "36px Arial", "#49CFEF");

    	plus.addEventListener("click", function() {
    		_isSub = false;
    		plus.color = "#49CFEF";
    		minus.color = "#405261";
    		plus.scaleX = 1.2;
    		plus.scaleY = 1.2;
    		minus.scaleX = 1.0;
    		minus.scaleY = 1.0;
    	});

    	plus.setBounds(-15,-15,30,30);

    	minus.setTransform(plus.getBounds().width, 0);
    	minus.addEventListener("click", function() {
    		_isSub = true;
    		minus.color = "#49CFEF";
    		plus.color = "#405261";
    		minus.scaleX = 1.2;
    		minus.scaleY = 1.2;
    		plus.scaleX = 1.0;
    		plus.scaleY = 1.0;
    	});

    	minus.setBounds(-15,-15,30,30);

    	_plusOrMinusUi.addChild(plus);
    	_plusOrMinusUi.addChild(minus);
    	_plusOrMinusUi.setTransform(0, _h-_plusOrMinusUi.getBounds().height);

    	_plusOrMinusUi.visible = false;

        _stage.addChild(playerPanel.ui);
        _stage.addChild(opponentsPanel.ui);
        _stage.addChild(_plusOrMinusUi);


    }

    function tick(e) {
        _stage.update(e);
    }

    init();

})();
