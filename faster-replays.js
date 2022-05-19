var replayMultiplier = 0.5;

let replayControlsMod = function(){
  if(!(/minesweeper\.online\/game/.test(window.location.href))) {
    alert('You should be running this on minesweeper.online/game/... ya dingus!');
    return;
  }

  if(!(document.getElementById('replay_play_btn'))) {
    alert('You should be running this on a page with a replay ya dingus!');
    return;
  }

  const scripts = document.body.getElementsByTagName('script');
  for(let script of scripts) {
    if(script.src.indexOf('/js/app') != -1){
      const req = new XMLHttpRequest();
      req.open('GET', script.src);
      req.onload = function() {
        processCode(this.responseText)
      };
      req.send();
    }
  }
  
};

function processCode(code) {
  let pauseUnpause = code.match(/on\("click",function\(\){([$a-zA-Z0-9_]{0,6}\.[$a-zA-Z0-9_]{0,6})\(\)}\)\.append\(\$\("<span>",{id:"replay_play_btn",/)[1];

  /*UI*/
  addSlider(pauseUnpause);

  /*Find name of the object that contains timer related functions*/
  let objectWithReplayStuff = code.match(/([$a-zA-Z0-9_]{0,6})={[$a-zA-Z0-9_]{0,6}:null,[$a-zA-Z0-9_]{0,6}:null,[$a-zA-Z0-9_]{0,6}:null,[$a-zA-Z0-9_]{0,6}:null,[$a-zA-Z0-9_]{0,6}:null,[$a-zA-Z0-9_]{0,6}:!1,/)[1];

  let funcWithInterval = findFunctionInCode(code,
    /[$a-zA-Z0-9_]{0,6}:function\(\)$/,
    /this\.[$a-zA-Z0-9_]{0,6}\|\|\(this\.[$a-zA-Z0-9_]{0,6}=setInterval\(\$\.proxy\(this/);
    
  /*Change it so setInterval runs more often - how much more often is determined by the value of replayMultiplier*/
  funcWithInterval = assertReplace(funcWithInterval, /\$\.proxy\(this\.i38,this\),/, '$& replayMultiplier *');
  
  /*Currently function looks like abc:function(){...}*/
  /*change it to look like def.abc=function(){...}*/
  funcWithInterval = objectWithReplayStuff + '.' + assertReplace(funcWithInterval,':','=');
  
  eval(funcWithInterval);

  /*Change all the jquery animate stuff to have a shorter duration - how much shorter is determined by the value of replayMultiplier*/
  /*These animations are used to move the cursor around*/
  let funcWithCursor = findFunctionInCode(code,
    /[$a-zA-Z0-9_]{0,6}:function\([a-z]\)$/,
    /\$\("#click_circle"\)\.animate/
  );

  /*Animation for cursor moving to somewhere else - there are two of these though here we just replace the first one as the second one gets replaced later.*/
  funcWithCursor = assertReplace(funcWithCursor, /\$\("#click_circle"\)\.animate\([a-z],/, '$& replayMultiplier *');

  /*Animations for cursor going invisible*/
  funcWithCursor = assertReplace(funcWithCursor,
    /(opacity:0},)(this\.[$a-zA-Z0-9_]{0,6}\)},this\),)/,
    '$1 replayMultiplier * $2 replayMultiplier *');

  /*Animation for cursor moving to somewhere else, but the 2nd kind - maybe which kind depends on how long they take between clicks, but idk*/
  funcWithCursor = assertReplace(funcWithCursor,
    /(animate\([a-z],)([a-z]\)},this\),)/,
    '$1 replayMultiplier * $2 replayMultiplier *');

  /*Currently function looks like abc:function(t){...}*/
  /*change it to look like def.abc=function(t){...}*/
  funcWithCursor = objectWithReplayStuff + '.' + assertReplace(funcWithCursor,':','=');

  eval(funcWithCursor);
}

function addSlider(pauseUnpause) {
  let sliderContainer = document.createElement('div');
  sliderContainer.style =  'max-width:200px';
  let sliderHtml = `
  <label for="replay-speed">Replay Speed x<span id="multiplier">2</span></label>
  <input type="range" id="replay-speed" name="replay-speed" value="20" min="1" max="23">
  `;
  sliderContainer.innerHTML = sliderHtml;

  /*document.getElementsByClassName('wrapper-pavel-inside')[0].firstChild.appendChild(sliderContainer);*/
  document.getElementsByClassName('result-block')[0].firstChild.prepend(sliderContainer);

  document.getElementById('replay-speed').addEventListener('input', function() {
    

    let sliderPosition = this.value;
    let multiplier = 1;

    /*Scale value to map to common values*/
    if(sliderPosition >= 1 && sliderPosition <= 9) {
      multiplier = 0.01 * sliderPosition;/*0.01 through 0.09*/
    } else if(sliderPosition >= 10 && sliderPosition <= 18) {
      multiplier = 0.1 * (sliderPosition - 9);/*0.1 through 0.9*/
    } else if(sliderPosition >= 19 && sliderPosition <= 23) {
      multiplier = sliderPosition - 18;/*1 through 5*/
    }

    replayMultiplier = 1/multiplier;
    document.getElementById('multiplier').textContent = Math.round(multiplier * 100) / 100;
    
    /*Slighty hacky - pause/unpause to fix bug where replay speed doesn't properly update when the replay is already running*/
    let replayStartButton = document.getElementById('replay_play_btn');
    if(replayStartButton.classList.contains('hide')) {
      eval(`${pauseUnpause}()`);
      eval(`${pauseUnpause}()`);
    }
    
  });
}

/*Helper functions below taken from my google snake mods.*/

/*
This function will search for a function/method in some code and return this function as a string

functionSignature will be regex matching the beginning of the function/method (must end in $),
for example if we are trying to find a function like s_xD = function(a, b, c, d, e) {......}
then put functionSignature = /[$a-zA-Z0-9_]{0,6}=function\(a,b,c,d,e\)$/

somethingInsideFunction will be regex matching something in the function
for example if we are trying to find a function like s_xD = function(a, b, c, d, e) {...a.Xa&&10!==a.Qb...}
then put somethingInsideFunction = /a\.[$a-zA-Z0-9_]{0,6}&&10!==a\.[$a-zA-Z0-9_]{0,6}/
*/
function findFunctionInCode(code, functionSignature, somethingInsideFunction, logging = false) {
  let functionSignatureSource = functionSignature.source;
  let functionSignatureFlags = functionSignature.flags;/*Probably empty string*/

  /*Check functionSignature ends in $*/
  if (functionSignatureSource[functionSignatureSource.length - 1] !== "$") {
    throw new Error("functionSignature regex should end in $");
  }

  /*Allow line breaks after commas or =. This is bit sketchy, but should be ok as findFunctionInCode is used in a quite limited way*/
  functionSignatureSource.replaceAll(/,|=/g,'$&\\n?');
  functionSignature = new RegExp(functionSignatureSource, functionSignatureFlags);

  /*get the position of somethingInsideFunction*/
  let indexWithinFunction = code.search(somethingInsideFunction);
  if (indexWithinFunction == -1) {
    console.log("%cCouldn't find a match for somethingInsideFunction", "color:red;");
    diagnoseRegexError(code, somethingInsideFunction);
  }

  /*expand outwards from somethingInsideFunction until we get to the function signature, then count brackets
  to find the end of the function*/
  startIndex = 0;
  for (let i = indexWithinFunction; i >= 0; i--) {
    let startOfCode = code.substring(0, i);
    startIndex = startOfCode.search(functionSignature);
    if (startIndex !== -1) {
      break;
    }
    if (i == 0) {
      throw new Error("Couldn't find function signature");
    }
  }

  let bracketCount = 0;
  let foundFirstBracket = false;
  let endIndex = 0;
  /*Use bracket counting to find the whole function*/
  let codeLength = code.length;
  for (let i = startIndex; i <= codeLength; i++) {
    if (!foundFirstBracket && code[i] == "{") {
      foundFirstBracket = true;
    }

    if (code[i] == "{") {
      bracketCount++;
    }
    if (code[i] == "}") {
      bracketCount--;
    }
    if (foundFirstBracket && bracketCount == 0) {
      endIndex = i;
      break;
    }

    if (i == codeLength) {
      throw new Error("Couldn't pair up brackets");
    }
  }

  let fullFunction = code.substring(startIndex, endIndex + 1);

  /*throw error if fullFunction doesn't contain something inside function - i.e. function signature was wrong*/
  if (fullFunction.search(somethingInsideFunction) === -1) {
    throw new Error("Function signature does not belong to the same function as somethingInsideFunction");
  }

  if (logging) {
    console.log(fullFunction);
  }

  return fullFunction;
}

/*
Same as replace, but throws an error if nothing is changed
*/
function assertReplace(baseText, regex, replacement) {
  if (typeof baseText !== 'string') {
    throw new Error('String argument expected for assertReplace');
  }
  let outputText = baseText.replace(regex, replacement);

  /*Throw warning if nothing is replaced*/
  if (baseText === outputText) {
    diagnoseRegexError(baseText, regex);
  }

  return outputText;
}

/*
Same as replaceAll, but throws an error if nothing is changed
*/
function assertReplaceAll(baseText, regex, replacement) {
  if (typeof baseText !== 'string') {
    throw new Error('String argument expected for assertReplace');
  }
  let outputText = baseText.replaceAll(regex, replacement);

  /*Throw warning if nothing is replaced*/
  if (baseText === outputText) {
    diagnoseRegexError(baseText, regex);
  }

  return outputText;
}

function diagnoseRegexError(baseText, regex) {  
  if(!(regex instanceof RegExp)) {
    throw new Error('Failed to find match using string argument. No more details available');
  }

  /*see if removing line breaks works - in that case we can give a more useful error message*/
  let oneLineText = baseText.replaceAll(/\n/g,'');
  let res = regex.test(oneLineText);

  /*If line breaks don't solve the issue then throw a general error*/
  if (!res) {
    throw new Error('Failed to find match for regex.');
  }

  /*Try to suggest correct regex to use for searching*/
  let regexSource = regex.source;
  let regexFlags = regex.flags;

  /*Look at all the spots where line breaks might occur and try adding \n? there to see if it makes a difference*/
  /*It might be easier to just crudely brute force putting \n? at each possible index?*/
  for(let breakableChar of ["%","&","\\*","\\+",",","-","\\/",":",";","<","=",">","\\?","{","\\|","}"]) {
    for(let pos = regexSource.indexOf(breakableChar); pos !== -1; pos = regexSource.indexOf(breakableChar, pos + 1)) {
      /*Remake the regex with a new line at the candidate position*/
      let candidateRegexSource = `${regexSource.slice(0,pos + breakableChar.length)}\\n?${regexSource.slice(pos + breakableChar.length)}`;
      let candidateRegex;
      
      try{
        candidateRegex = new RegExp(candidateRegexSource, regexFlags);
      } catch(err) {
        continue;
      }

      /*See if the new regex works*/
      let testReplaceResult = candidateRegex.test(baseText);
      if(testReplaceResult) {
        /*Success we found the working regex! Give descriptive error message to user and log suggested regex with new line in correct place*/
        console.log(`Suggested regex improvement:
${candidateRegex}`);
        throw new Error('Suggested improvement found! Error with line break, failed to find match for regex. See logged output for regex to use instead that should hopefully fix this.');
      }
    }
  }

  throw new Error('Line break error! Failed to failed to find match for regex - most likely caused by a new line break. No suggestions provided');
}

replayControlsMod();