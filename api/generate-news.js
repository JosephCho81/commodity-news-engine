import fetch from "node-fetch";

export default async function handler(req, res) {

const today = new Date().toISOString().slice(0,10)


// 1️⃣ 뉴스 API
const news = await fetch(
`https://newsapi.org/v2/everything?q=aluminum OR scrap OR iron OR copper&language=en&pageSize=100&apiKey=YOUR_KEY`
)

const newsData = await news.json()


// 2️⃣ LME 가격 크롤러
const lme = await fetch(
"https://query1.finance.yahoo.com/v7/finance/quote?symbols=ALI=F"
)

const lmeData = await lme.json()


// 3️⃣ AI 분석 요청
const ai = await fetch(
"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_AI_KEY",
{
method:"POST",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify({

contents:[{
parts:[{
text:`${JSON.stringify(newsData.articles)}`
}]
}]

})
}
)

const aiResult = await ai.json()


res.json({
date:today,
lme:lmeData,
news:aiResult
})

}
