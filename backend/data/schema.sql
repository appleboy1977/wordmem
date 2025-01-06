CREATE TABLE 
    words 
    ( 
        wid      TEXT, 
        word     TEXT, 
        pron     TEXT, 
        pos      TEXT, 
        EXPLAIN  TEXT, 
        audio    TEXT, 
        examples TEXT, 
        PRIMARY KEY (wid) 
    );

CREATE TABLE 
    study_records 
    ( 
        wid      TEXT NOT NULL, 
        user_id  INTEGER NOT NULL, 
        ldate    DATETIME, 
        level    INTEGER, 
        note     TEXT, 
        score    INTEGER, 
        excluded BOOLEAN DEFAULT NULL, 
        PRIMARY KEY (wid, user_id) 
    );

CREATE TABLE 
    study_logs 
    ( 
        id           INTEGER, 
        user_id      INTEGER NOT NULL, 
        wid          TEXT NOT NULL, 
        action_type  TEXT NOT NULL, 
        status       INTEGER, 
        elapsed_time INTEGER, 
        review_count INTEGER, 
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP, 
        PRIMARY KEY (id) 
    );

--

CREATE VIEW 
    vw_study_records_calc AS 
SELECT 
    DATETIME(ldate)                                                AS lldate,
    ( julianday(DATETIME('now', 'localtime')) - julianday(ldate) ) AS days_diff,
    EXP( -(julianday(DATETIME('now', 'localtime')) - julianday(ldate)) / (COALESCE(score, 0) + 1) ) 
    AS retention_rate,
    ((julianday(DATETIME('now', 'localtime')) - julianday(ldate)) * (1.0 / EXP( -(julianday 
    (DATETIME('now', 'localtime')) - julianday(ldate)) / (COALESCE(score, 0) + 1) ))) AS priority, 
    *
FROM 
    study_records
ORDER BY 
    ldate DESC;

---
CREATE VIEW 
    vw_today_review_list AS 
SELECT 
    * 
FROM 
    vw_study_records_calc
WHERE 
    level > 1
ORDER BY 
    priority DESC;

--
CREATE VIEW 
    vw_words_stat_from_log AS 
SELECT
    wid,
    SUM(CASE WHEN status = -1 THEN 1 ELSE 0 END) AS failed_count,
    SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS success_count
FROM
    study_logs
WHERE 
    status IS NOT NULL 
    AND status != ''
GROUP BY
    wid
ORDER BY
    failed_count DESC;