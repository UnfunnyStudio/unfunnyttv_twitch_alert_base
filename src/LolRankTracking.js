import {env, SaveEnv} from './jsonenv.js'
import axios from 'axios'
import {database} from "./Database.js";
import {io} from "./webserver.js"

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


const GetLolUserID = async () => {
    const res = await axios.get(
        `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${env.lol_summoner_name}`,
        {
            headers: {'X-Riot-Token': env.lol_api_key}
        }
    );

    env.lol_id = res.data.puuid
    SaveEnv()
}

const UpdateLolMatches = async () => {
    // gets latest match in db
    const row = await database.prepare(`SELECT *
                                        FROM lol_matches
                                        ORDER BY game_timestamp DESC LIMIT 1;`).get()

    let n = 0
    const most_recent_match_id = row?.match_id
    let not_uptodate = true;

    console.log("[INFO] updating users matches this can take a while.....")
    while (not_uptodate) {
        const matchIdsRes = await axios.get(
            `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${env.lol_id}/ids?start=${n}&count=20&type=ranked&queue=420`,
            {
                headers: {'X-Riot-Token': env.lol_api_key}
            }
        );

        if (matchIdsRes.data.length === 0) break; // there is no more matches

        for (let i = 0; i < matchIdsRes.data.length; i++) {
            const matchId = matchIdsRes.data[i];

            if (matchId === most_recent_match_id) {
                console.log("[INFO] users matches are up to date")
                not_uptodate = false;
                break
            } // we are up to date!


            const matchRes = await axios.get(
                `https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}`,
                {
                    headers: {'X-Riot-Token': env.lol_api_key}
                }
            );

            //console.log(matchRes.data);

            const insertStmt = database.prepare(`
                INSERT INTO lol_matches (lol_id, match_id, winloss, game_timestamp, game_length)
                VALUES (?, ?, ?, ?, ?)
            `);

            const game_creation = matchRes.data.info.gameCreation;
            const game_length = matchRes.data.info.gameDuration
            // player
            const participant = matchRes.data.info.participants.find(p => p.puuid === env.lol_id);


            insertStmt.run(env.lol_id, matchId, participant.win ? 1 : 0, game_creation, game_length);
            await sleep(1500)
            console.log(`[INFO] added one`)
        }
        n += 20;
        console.log(`[INFO] added ${n} games so far`)
    }

}

const GetWinLosses = () => {
    const stmt = database.prepare(`
        SELECT IFNULL(SUM(CASE WHEN winloss = 1 THEN 1 ELSE 0 END), 0) AS wins,
               IFNULL(SUM(CASE WHEN winloss = 0 THEN 1 ELSE 0 END), 0) AS losses
        FROM lol_matches
        WHERE game_timestamp >= ?
          AND game_length > 180
    `);

    const result = stmt.get(env.season_start_epoc_ms);

    return result;
}

const GetWinLosses12H = () => {
    const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);

    const stmt = database.prepare(`
        SELECT IFNULL(SUM(CASE WHEN winloss = 1 THEN 1 ELSE 0 END), 0) AS wins,
               IFNULL(SUM(CASE WHEN winloss = 0 THEN 1 ELSE 0 END), 0) AS losses
        FROM lol_matches
        WHERE game_timestamp >= ?
          AND game_length > 180
    `);

    const result = stmt.get(twelveHoursAgo);

    return result;
};


export const StartLolRankTracking = async () => {
    console.log("[INFO] starting LolRankTracking");

    await GetLolUserID();
    await UpdateLolMatches();

    setInterval(async () => {
        const rankRes = await axios.get(`https://${env.lol_region}.api.riotgames.com/lol/league/v4/entries/by-puuid/${env.lol_id}`, {
            headers: {'X-Riot-Token': env.lol_api_key}
        });

        const soloQ = rankRes.data.find(queue => queue.queueType === 'RANKED_SOLO_5x5');

        const row = await database.prepare(`SELECT *
                                            FROM lol_elo
                                            ORDER BY id DESC LIMIT 1;`).get()

        if (!row || row.rank !== soloQ.rank || row.tier !== soloQ.tier || row.points !== soloQ.leaguePoints) {
            const insertStmt = database.prepare(`
                INSERT INTO lol_elo (rank, points, tier)
                VALUES (?, ?, ?)
            `);

            insertStmt.run(soloQ.rank, soloQ.leaguePoints, soloQ.tier);
        }

    }, 10 * 1000)


    setInterval( async () => {
        const row = await database.prepare(`SELECT *
                                            FROM lol_elo
                                            ORDER BY id DESC LIMIT 1;`).get()

        const overll_win_loss = GetWinLosses();
        const win_loss_12h = GetWinLosses12H();
        io.emit("lol", row.rank, row.points, overll_win_loss.wins, overll_win_loss.losses, win_loss_12h.wins, win_loss_12h.losses, row.tier);
    }, 10 * 1000)
}