package io.github.headlesshq.web.mods.icon;

import io.github.headlesshq.headlessmc.mods.github.ModRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Any;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

/**
 * Icons of the mods distributed by HeadlessMc's GitHub platform: the avatar of the owner of their {@link ModRepository}.
 */
@ApplicationScoped
public class GitHubIconService {
    private final Instance<ModRepository> repositories;

    @Inject
    public GitHubIconService(@Any Instance<ModRepository> repositories) {
        this.repositories = repositories;
    }

    /**
     * @param names the {@link ModRepository#getName() names} of mods.
     * @return the icon urls of the mods, by name.
     */
    public Map<String, String> getIcons(Collection<String> names) {
        Map<String, String> result = new HashMap<>();
        for (ModRepository repository : repositories) {
            if (names.contains(repository.getName())) {
                result.put(repository.getName(), "https://github.com/" + repository.getOwner() + ".png?size=64");
            }
        }

        return result;
    }

}
