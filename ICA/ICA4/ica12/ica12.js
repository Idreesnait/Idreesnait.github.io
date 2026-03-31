let new8tn = document.querySelector('#js-new-quote');
new8tn.addEventListener('click', getQuote);

let answer8tn = document.querySelector('#js-tweet');
answer8tn.addEventListener('click', showAnswer);

let current = {
    question: "",
    answer: ""
}

const endpoint = 'https://trivia.cyberwisp.com/getrandomchristmasquestion';
 // alert('THIS WORKS');
async function getQuote() {
    // alert('THIS WORKS');
    try {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw Error(response.statusText);
        }
        const json = await response.json();
        console.log(json);
        displayQuote(json.question);
        current.question = json.question;
        current.answer = json.answer;
    } catch (error) {
        console.log(error);
        alert ('FAILED TO FETCH NEW QUOTE');
    }
    
}

function displayQuote(quote) {
    const quoteText = document.querySelector('#js-quote-text');
    const answerText = document.querySelector('#js-answer-text');
    quoteText.textContent = quote;
    answerText.textContent = "";
}

function showAnswer() {
    const answerText = document.querySelector('#js-answer-text');
    answerText.textContent = current.answer;
}

getQuote();