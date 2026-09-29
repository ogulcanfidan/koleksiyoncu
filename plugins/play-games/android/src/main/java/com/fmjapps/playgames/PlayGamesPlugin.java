package com.fmjapps.playgames;

import android.app.Activity;
import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.games.GamesSignInClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.gms.tasks.Task;

/**
 * Google Play Oyun Hizmetleri (v2) köprüsü.
 * Oyun açılışta sessizce giriş yapar (v2 bunu kendisi dener); oyuncu girmemişse signIn() izin ekranını açar.
 * Puan gönderme ve başarım açma yalnızca giriş yapılmışsa çalışır; aksi halde sessizce geçilir.
 */
@CapacitorPlugin(name = "PlayGames")
public class PlayGamesPlugin extends Plugin {
    private static final int RC_UI = 9004;

    @Override
    public void load() {
        PlayGamesSdk.initialize(getContext());
    }

    private GamesSignInClient signInClient() {
        return PlayGames.getGamesSignInClient(getActivity());
    }

    @PluginMethod
    public void isAuthenticated(PluginCall call) {
        signInClient().isAuthenticated().addOnCompleteListener(t -> {
            JSObject r = new JSObject();
            r.put("isAuthenticated", t.isSuccessful() && t.getResult() != null && t.getResult().isAuthenticated());
            call.resolve(r);
        });
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        GamesSignInClient client = signInClient();
        client.isAuthenticated().addOnCompleteListener(t -> {
            if (t.isSuccessful() && t.getResult() != null && t.getResult().isAuthenticated()) {
                resolvePlayer(call);
                return;
            }
            client.signIn().addOnCompleteListener(t2 -> {
                if (t2.isSuccessful() && t2.getResult() != null && t2.getResult().isAuthenticated()) resolvePlayer(call);
                else call.reject("Play Games girişi yapılmadı");
            });
        });
    }

    private void resolvePlayer(PluginCall call) {
        PlayGames.getPlayersClient(getActivity()).getCurrentPlayer().addOnCompleteListener(t -> {
            JSObject r = new JSObject();
            r.put("isAuthenticated", true);
            if (t.isSuccessful() && t.getResult() != null) {
                r.put("player_id", t.getResult().getPlayerId());
                r.put("player_name", t.getResult().getDisplayName());
            }
            call.resolve(r);
        });
    }

    @PluginMethod
    public void submitScore(PluginCall call) {
        String id = call.getString("leaderboardID");
        Double score = call.getDouble("totalScoreAmount");
        if (id == null || score == null) { call.reject("leaderboardID ve totalScoreAmount gerekli"); return; }
        whenSignedIn(call, () -> PlayGames.getLeaderboardsClient(getActivity()).submitScore(id, Math.round(score)));
    }

    @PluginMethod
    public void unlockAchievement(PluginCall call) {
        String id = call.getString("achievementID");
        if (id == null) { call.reject("achievementID gerekli"); return; }
        whenSignedIn(call, () -> PlayGames.getAchievementsClient(getActivity()).unlock(id));
    }

    @PluginMethod
    public void showLeaderboard(PluginCall call) {
        String id = call.getString("leaderboardID");
        if (id == null) { call.reject("leaderboardID gerekli"); return; }
        showUi(call, PlayGames.getLeaderboardsClient(getActivity()).getLeaderboardIntent(id));
    }

    @PluginMethod
    public void showAchievements(PluginCall call) {
        showUi(call, PlayGames.getAchievementsClient(getActivity()).getAchievementsIntent());
    }

    /** Giriş yapılmışsa işi yapar; yapılmamışsa hata vermeden geçer. */
    private void whenSignedIn(PluginCall call, Runnable work) {
        signInClient().isAuthenticated().addOnCompleteListener(t -> {
            boolean ok = t.isSuccessful() && t.getResult() != null && t.getResult().isAuthenticated();
            if (ok) work.run();
            JSObject r = new JSObject();
            r.put("sent", ok);
            call.resolve(r);
        });
    }

    private void showUi(PluginCall call, Task<Intent> intentTask) {
        Activity activity = getActivity();
        intentTask
            .addOnSuccessListener(intent -> { activity.startActivityForResult(intent, RC_UI); call.resolve(); })
            .addOnFailureListener(e -> call.reject(e.getMessage() != null ? e.getMessage() : "Play Games ekranı açılamadı"));
    }
}
