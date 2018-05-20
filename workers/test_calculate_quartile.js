var assert = require('assert');
var moment = require('moment');
const uuid = require('uuid/v4');
var sleep = require('sleep');
var jStat = require('jStat').jStat;
var MongoRmqWorker = require('../lib/MongoRmqWorker');


// calc single team / date range quartiles

const c = 'test_calc';
const quartileNames = ['100%', '75%', '50%', '25%'];


class Task extends MongoRmqWorker {

  /*
     calc single team / date range quartiles
  */
  async myTask(db, data, msg, conn, ch) {

    try {

      let result = {
        occlusion_plus_5_completely_correct_score_q1: 0,
        occlusion_plus_5_completely_correct_score_median: 0,
        occlusion_plus_5_completely_correct_score_q3: 0,

        occlusion_plus_2_completely_correct_score_q1: 0,
        occlusion_plus_2_completely_correct_score_median: 0,
        occlusion_plus_2_completely_correct_score_q3: 0,

        occlusion_none_completely_correct_score_q1: 0,
        occlusion_none_completely_correct_score_median: 0,
        occlusion_none_completely_correct_score_q3: 0,

        occlusion_plus_5_location_score_q1: 0,
        occlusion_plus_5_location_score_median: 0,
        occlusion_plus_5_location_score_q3: 0,

        occlusion_plus_2_location_score_q1: 0,
        occlusion_plus_2_location_score_median: 0,
        occlusion_plus_2_location_score_q3: 0,

        occlusion_none_location_score_q1: 0,
        occlusion_none_location_score_median: 0,
        occlusion_none_location_score_q3: 0,

        occlusion_plus_5_type_score_q1: 0,
        occlusion_plus_5_type_score_median: 0,
        occlusion_plus_5_type_score_q3: 0,

        occlusion_plus_2_type_score_q1: 0,
        occlusion_plus_2_type_score_median: 0,
        occlusion_plus_2_type_score_q3: 0,

        occlusion_none_type_score_q1: 0,
        occlusion_none_type_score_median: 0,
        occlusion_none_type_score_q3: 0,

        prs_q1: 0,
        prs_median: 0,
        prs_q3: 0,

        scoringAlgorithm: 'ScoreQuartile',
        dateStart: data.filter.dateStart,
        dateEnd: data.filter.dateEnd,
        team: data.filter.team
      };

      var setQuartile = function(row, quarts, scoreAnswerKey) {
        var rowScore = scoreAnswerKey != 'prs' ? row[`occlusion_${scoreAnswerKey}_score`] : row.prs;
            if (rowScore > quarts[0]) {

              if (rowScore > quarts[1]) {
                if (rowScore > quarts[2]) {
                  row[`${scoreAnswerKey}_quartile`] = quartileNames[3];
                } else {
                  row[`${scoreAnswerKey}_quartile`] = quartileNames[2];
                }
              } else {
                row[`${scoreAnswerKey}_quartile`] = quartileNames[1];
              }
            } else {
              row[`${scoreAnswerKey}_quartile`] = quartileNames[0];
            }
      };


      let query = {
        team: data.filter.team,
        scoringAlgorithm: "AvgToPercent"
      },
      projection = {
        id_submission: 1,
        occlusion_plus_5_completely_correct_score: 1,
        occlusion_plus_2_completely_correct_score: 1,
        occlusion_none_completely_correct_score: 1,
        occlusion_plus_5_type_score: 1,
        occlusion_plus_2_type_score: 1,
        occlusion_none_type_score: 1,
        occlusion_plus_5_location_score: 1,
        occlusion_plus_2_location_score: 1,
        occlusion_none_location_score: 1,
        prs: 1
      };

      if (data.filter.dateStart) {
        Object.assign(query.test_date, {$gte: data.filter.dateStart});
      }
      if (data.filter.dateEnd) {
        Object.assign(query.test_date, {$lte: data.filter.dateEnd});
      }

      let rows = await db.collection(c).find(query).project(projection).toArray();

      let answerTypes = ['completely_correct', 'type', 'location'];

      for (let answerType of answerTypes) {

        let maps = {
          plus_5: rows.map(x=>x['occlusion_plus_5_'+answerType+'_score']),
          plus_2: rows.map(x=>x['occlusion_plus_2_'+answerType+'_score']),
          none: rows.map(x=>x['occlusion_none_'+answerType+'_score'])
        };

        for (let scoreType of ['plus_5', 'plus_2', 'none']) {
          let quarts = jStat.quartiles(maps[scoreType]);
          result[`occlusion_${scoreType}_${answerType}_score_q1`] = quarts[0];
          result[`occlusion_${scoreType}_${answerType}_score_median`] = quarts[1];
          result[`occlusion_${scoreType}_${answerType}_score_q3`] = quarts[2];

          rows.forEach(row => {
            setQuartile(row, quarts, `${scoreType}_${answerType}`);
          });
        }
      }

      let quarts = jStat.quartiles(rows.map(x=>x.prs));
      result.prs_q1 = quarts[0];
      result.prs_median = quarts[1];
      result.prs_q3 = quarts[2];

      rows.forEach(row => {
        setQuartile(row, quarts, 'prs');
      });

      console.log(result);
      console.log(rows);

      rows = rows.map(row => {
        return {
          id_submission: row.id_submission,
          quartile_filter: data.filter,
          plus_5_completely_correct_quartile: row.plus_5_completely_correct_quartile,
          plus_2_completely_correct_quartile: row.plus_2_completely_correct_quartile,
          none_completely_correct_quartile: row.none_completely_correct_quartile,
          plus_5_type_quartile: row.plus_5_type_quartile,
          plus_2_type_quartile: row.plus_2_type_quartile,
          none_type_quartile: row.none_type_quartile,
          plus_5_location_quartile: row.plus_5_location_quartile,
          plus_2_location_quartile: row.plus_2_location_quartile,
          none_location_quartile: row.none_location_quartile,
          prs_quartile: row.prs_quartile
        }
      });

      console.log(rows);

      await Promise.all(
        [db.collection('test_calc').update({dateStart:result.dateStart, dateEnd:result.dateEnd, team:result.team}, result, {upsert:true})]
        .concat(rows.map(row => db.collection('test_usage').updateMany({id_submission:row.id_submission}, {$set:row})))
      );

      ch.ack(msg);

    } catch (ex) {
      console.log("Error: " + (ex.stack ? ex : ""));
      console.error(ex.stack || ex);
    }
  }
}

module.exports = Task;
