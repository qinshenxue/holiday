const superagent = require("superagent");
const cheerio = require("cheerio");

async function main(year) {
    const keyword = `${year}年部分节假日安排`;
    const searchUrl = `http://sousuo.gov.cn/s.htm?q=${encodeURIComponent(keyword)}`;
    const searchRes = await superagent.get(searchUrl);
    const $search = cheerio.load(searchRes.text);

    const links = $search(`a:contains(${keyword})`);

    for (let i = 0; i < links.length; i++) {
        const noticeUrl = links[i].attribs.href;
        const noticeRes = await superagent.get(noticeUrl);
        const $notice = cheerio.load(noticeRes.text);
        const notice = $notice("body").text();
        const holidaysMatch = notice.match(/((\d+年)?\d+月\d+日)(至((\d+年)?(\d+月)?\d+日))?.*?放假/g);

        if (holidaysMatch) {
            const holidays = [];
            const wrokdays = [];
            holidaysMatch.forEach((item) => {
                let m, start, end;
                if ((m = item.match(/(\d+年\d+月\d+)日至(\d+年\d+月\d+)日.*?放假/))) {
                    start = new Date(m[1].replace(/年|月/g, "/"));
                    end = new Date(m[2].replace(/年|月/g, "/"));
                } else if ((m = item.match(/(\d+)月(\d+)日至(\d+)月(\d+)日.*?放假/))) {
                    start = new Date(`${year}/${m[1]}/${m[2]}`);
                    end = new Date(`${year}/${m[3]}/${m[4]}`);
                } else if ((m = item.match(/(\d+)月(\d+)日至(\d+)日.*?放假/))) {
                    start = new Date(`${year}/${m[1]}/${m[2]}`);
                    end = new Date(`${year}/${m[1]}/${m[3]}`);
                } else if ((m = item.match(/(\d+)月(\d+)日放假/))) {
                    start = end = new Date(`${year}/${m[1]}/${m[2]}`);
                }

                if (start && end) {
                    start = start.getTime();
                    end = end.getTime();
                    while (start <= end) {
                        holidays.push(new Date(start).toLocaleDateString());
                        start += 24 * 60 * 60 * 1000;
                    }
                }
            });

            const wrokdaysMatch = notice.match(/\d+月\d+日（星期.）(、\d+日（星期.）)*/g);

            wrokdaysMatch.forEach((item) => {
                let m = null;
                if ((m = item.match(/\d+月\d+/g))) {
                    m.forEach((item) => {
                        const date = new Date(year + "/" + item.replace("月", "/"));
                        if (date) {
                            wrokdays.push(date.toLocaleDateString());
                        }
                    });
                    const daysMatch = item.match(/(?<=、)\d+(?=日)/g);
                    const month = m[0].slice(0, 1);
                    if (daysMatch) {
                        daysMatch.forEach((day) => {
                            const date = new Date(`${year}/${month}/${day}`);
                            if (date) {
                                wrokdays.push(date.toLocaleDateString());
                            }
                        });
                    }
                }
            });

            let yearDate = new Date(year + "/1/1").getTime();
            let yearEnd = new Date(year + "/12/31").getTime();
            const yearDates = [];
            while (yearDate <= yearEnd) {
                const date = new Date(yearDate);
                const dateStr = date.toLocaleDateString();
                const week = date.getDay();
                if (holidays.indexOf(dateStr) > -1) {
                    desc = "节假";
                } else if (wrokdays.indexOf(dateStr) > -1) {
                    desc = "补班";
                } else if ([0, 6].indexOf(week) > -1) {
                    desc = "双休";
                } else {
                    desc = "上班";
                }
                if (!yearDates[date.getDate() - 1]) {
                    yearDates[date.getDate() - 1] = {};
                }
                yearDates[date.getDate() - 1][date.getMonth() + 1 + "月"] = `${dateStr.split("-")[2].padStart(2, " ")} ${["日", "一", "二", "三", "四", "五", "六"][week]} ${desc}`;
                yearDate += 24 * 60 * 60 * 1000;
            }
            console.table(yearDates);
            break;
        }
    }
}
main(process.argv[2]);
