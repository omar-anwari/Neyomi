import { graphql } from './gql';

export const LoginMutation = graphql(`
  mutation Login($username: String!, $password: String!) {
    login(input: { username: $username, password: $password }) {
      accessToken
      refreshToken
    }
  }
`);

export const RefreshTokenMutation = graphql(`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(input: { refreshToken: $refreshToken }) {
      accessToken
    }
  }
`);

export const LibraryMangasQuery = graphql(`
  query LibraryMangas($first: Int) {
    mangas(condition: { inLibrary: true }, order: [{ by: TITLE }], first: $first) {
      totalCount
      pageInfo {
        hasNextPage
      }
      nodes {
        id
        title
        thumbnailUrl
        unreadCount
        genre
      }
    }
  }
`);

export const SourcesQuery = graphql(`
  query Sources {
    sources(first: 500) {
      nodes {
        id
        name
        displayName
        lang
        iconUrl
        supportsLatest
      }
    }
  }
`);

export const SourceInfoQuery = graphql(`
  query SourceInfo($id: LongString!) {
    source(id: $id) {
      id
      displayName
      supportsLatest
      isConfigurable
    }
  }
`);

export const BrowseSourceMutation = graphql(`
  mutation BrowseSource(
    $source: LongString!
    $type: FetchSourceMangaType!
    $page: Int!
    $query: String
    $filters: [FilterChangeInput!]
  ) {
    fetchSourceManga(
      input: { source: $source, type: $type, page: $page, query: $query, filters: $filters }
    ) {
      hasNextPage
      mangas {
        id
        title
        thumbnailUrl
        inLibrary
        status
        genre
      }
    }
  }
`);

export const HomeMangasQuery = graphql(`
  query HomeMangas($first: Int) {
    mangas(condition: { inLibrary: true }, order: [{ by: IN_LIBRARY_AT, byType: DESC }], first: $first) {
      nodes {
        id
        title
        thumbnailUrl
        unreadCount
        inLibraryAt
        genre
        description
        sourceId
        source {
          id
          displayName
        }
        categories {
          nodes {
            id
            name
            order
          }
        }
        firstUnreadChapter {
          id
        }
        lastReadChapter {
          id
          lastPageRead
          pageCount
        }
        latestReadChapter {
          lastReadAt
        }
        latestUploadedChapter {
          name
          chapterNumber
          uploadDate
        }
      }
    }
  }
`);

export const LibraryFullQuery = graphql(`
  query LibraryFull($first: Int) {
    mangas(condition: { inLibrary: true }, order: [{ by: TITLE }], first: $first) {
      totalCount
      nodes {
        id
        title
        thumbnailUrl
        unreadCount
        inLibraryAt
        chapters {
          totalCount
        }
        latestUploadedChapter {
          uploadDate
        }
        lastReadChapter {
          id
          lastReadAt
        }
        firstUnreadChapter {
          id
          name
          chapterNumber
        }
      }
    }
  }
`);

export const ContinueReadingQuery = graphql(`
  query ContinueReading($first: Int) {
    chapters(
      filter: { inLibrary: { equalTo: true }, lastReadAt: { greaterThan: "0" } }
      order: [{ by: LAST_READ_AT, byType: DESC }]
      first: $first
    ) {
      nodes {
        id
        name
        chapterNumber
        lastPageRead
        pageCount
        isRead
        lastReadAt
        mangaId
        manga {
          id
          title
          thumbnailUrl
          unreadCount
          firstUnreadChapter {
            id
          }
        }
      }
    }
  }
`);

export const LibraryUpdatesQuery = graphql(`
  query LibraryUpdates($first: Int) {
    chapters(
      filter: { inLibrary: { equalTo: true } }
      order: [{ by: FETCHED_AT, byType: DESC }]
      first: $first
    ) {
      totalCount
      pageInfo {
        hasNextPage
      }
      nodes {
        id
        name
        chapterNumber
        fetchedAt
        uploadDate
        isRead
        isDownloaded
        isBookmarked
        lastPageRead
        mangaId
        manga {
          id
          title
          thumbnailUrl
        }
      }
    }
  }
`);

export const UpdateLibraryMutation = graphql(`
  mutation UpdateLibrary {
    updateLibrary(input: {}) {
      updateStatus {
        jobsInfo {
          isRunning
          totalJobs
          finishedJobs
          skippedMangasCount
          skippedCategoriesCount
        }
      }
    }
  }
`);

export const LibraryUpdateStatusQuery = graphql(`
  query LibraryUpdateStatus {
    libraryUpdateStatus {
      jobsInfo {
        isRunning
        totalJobs
        finishedJobs
        skippedMangasCount
        skippedCategoriesCount
      }
    }
  }
`);

export const MangaDetailQuery = graphql(`
  query MangaDetail($id: Int!) {
    manga(id: $id) {
      id
      initialized
      chapters {
        totalCount
      }
      title
      author
      artist
      status
      genre
      description
      inLibrary
      unreadCount
      realUrl
      thumbnailUrl
      source {
        displayName
        lang
      }
      meta {
        key
        value
      }
      firstUnreadChapter {
        id
        name
        chapterNumber
      }
      lastReadChapter {
        id
      }
    }
  }
`);

export const FetchMangaAndChaptersMutation = graphql(`
  mutation FetchMangaAndChapters($id: Int!) {
    fetchMangaAndChapters(input: { id: $id, fetchManga: true, fetchChapters: true }) {
      manga {
        id
        initialized
      }
      chapters {
        id
      }
    }
  }
`);

export const UpdateMangaLibraryMutation = graphql(`
  mutation UpdateMangaLibrary($id: Int!, $inLibrary: Boolean!) {
    updateManga(input: { id: $id, patch: { inLibrary: $inLibrary } }) {
      manga {
        id
        inLibrary
      }
    }
  }
`);

export const ReaderChapterQuery = graphql(`
  query ReaderChapter($id: Int!) {
    chapter(id: $id) {
      id
      name
      chapterNumber
      sourceOrder
      pageCount
      lastPageRead
      isRead
      isBookmarked
      mangaId
      realUrl
      manga {
        id
        title
        realUrl
        source {
          displayName
        }
        meta {
          key
          value
        }
      }
    }
  }
`);

export const SetMangaMetaMutation = graphql(`
  mutation SetMangaMeta($mangaId: Int!, $key: String!, $value: String!) {
    setMangaMeta(input: { meta: { mangaId: $mangaId, key: $key, value: $value } }) {
      meta {
        key
        value
      }
    }
  }
`);

export const NextChapterQuery = graphql(`
  query NextChapter($mangaId: Int!, $sourceOrder: Int!) {
    chapters(condition: { mangaId: $mangaId, sourceOrder: $sourceOrder }, first: 1) {
      nodes {
        id
        name
        chapterNumber
        sourceOrder
      }
    }
  }
`);

export const FetchChapterPagesMutation = graphql(`
  mutation FetchChapterPages($chapterId: Int!) {
    fetchChapterPages(input: { chapterId: $chapterId }) {
      pages
    }
  }
`);

export const UpdateChapterProgressMutation = graphql(`
  mutation UpdateChapterProgress($id: Int!, $patch: UpdateChapterPatchInput!) {
    updateChapter(input: { id: $id, patch: $patch }) {
      chapter {
        id
        isRead
        lastPageRead
      }
    }
  }
`);

export const ChapterIdRangeQuery = graphql(`
  query ChapterIdRange($mangaId: Int!, $filter: ChapterFilterInput) {
    chapters(condition: { mangaId: $mangaId }, filter: $filter) {
      totalCount
      nodes {
        id
      }
    }
  }
`);

export const UpdateChaptersMutation = graphql(`
  mutation UpdateChapters($ids: [Int!]!, $patch: UpdateChapterPatchInput!) {
    updateChapters(input: { ids: $ids, patch: $patch }) {
      chapters {
        id
        isRead
        lastPageRead
      }
    }
  }
`);

export const MangaChaptersQuery = graphql(`
  query MangaChapters(
    $mangaId: Int!
    $first: Int
    $order: [ChapterOrderInput!]
    $filter: ChapterFilterInput
  ) {
    chapters(condition: { mangaId: $mangaId }, filter: $filter, order: $order, first: $first) {
      totalCount
      pageInfo {
        hasNextPage
      }
      nodes {
        id
        name
        chapterNumber
        sourceOrder
        isRead
        isBookmarked
        isDownloaded
        pageCount
        scanlator
        uploadDate
        lastPageRead
      }
    }
  }
`);

export const ServerSettingsQuery = graphql(`
  query ServerSettings {
    settings {
      globalUpdateInterval
      updateMangas
      excludeUnreadChapters
      excludeEntryWithUnreadChapters
      excludeNotStarted
      excludeCompleted
      maxSourcesInParallel

      backupPath
      backupTime
      backupInterval
      backupTTL
      autoBackupIncludeManga
      autoBackupIncludeCategories
      autoBackupIncludeChapters
      autoBackupIncludeTracking
      autoBackupIncludeHistory
      autoBackupIncludeClientData
      autoBackupIncludeServerSettings

      initialOpenInBrowserEnabled
      systemTrayEnabled
      webUIInterface
      webUIUpdateCheckInterval

      socksProxyEnabled
      socksProxyHost
      socksProxyPort
      socksProxyVersion
      socksProxyUsername
      socksProxyPassword

      flareSolverrEnabled
      flareSolverrUrl
      flareSolverrTimeout
      flareSolverrSessionName
      flareSolverrSessionTtl
      flareSolverrAsResponseFallback

      syncYomiEnabled
      syncYomiHost
      syncYomiApiKey
      syncInterval
      syncDataManga
      syncDataCategories
      syncDataChapters
      syncDataHistory
      syncDataTracking

      debugLogsEnabled
    }
  }
`);

export const UpdateServerSettingsMutation = graphql(`
  mutation UpdateServerSettings($settings: PartialSettingsTypeInput!) {
    setSettings(input: { settings: $settings }) {
      settings {
        globalUpdateInterval
        updateMangas
        excludeUnreadChapters
        excludeEntryWithUnreadChapters
        excludeNotStarted
        excludeCompleted
        maxSourcesInParallel

        backupPath
        backupTime
        backupInterval
        backupTTL
        autoBackupIncludeManga
        autoBackupIncludeCategories
        autoBackupIncludeChapters
        autoBackupIncludeTracking
        autoBackupIncludeHistory
        autoBackupIncludeClientData
        autoBackupIncludeServerSettings

        initialOpenInBrowserEnabled
        systemTrayEnabled
        webUIInterface
        webUIUpdateCheckInterval

        socksProxyEnabled
        socksProxyHost
        socksProxyPort
        socksProxyVersion
        socksProxyUsername
        socksProxyPassword

        flareSolverrEnabled
        flareSolverrUrl
        flareSolverrTimeout
        flareSolverrSessionName
        flareSolverrSessionTtl
        flareSolverrAsResponseFallback

        syncYomiEnabled
        syncYomiHost
        syncYomiApiKey
        syncInterval
        syncDataManga
        syncDataCategories
        syncDataChapters
        syncDataHistory
        syncDataTracking

        debugLogsEnabled
      }
    }
  }
`);

export const CategoriesQuery = graphql(`
  query Categories {
    categories(order: [{ by: ORDER }]) {
      nodes {
        id
        name
        order
        default
        includeInUpdate
        includeInDownload
        mangas {
          totalCount
        }
      }
    }
  }
`);

export const CreateCategoryMutation = graphql(`
  mutation CreateCategory($name: String!) {
    createCategory(input: { name: $name }) {
      category {
        id
        name
        order
      }
    }
  }
`);

export const UpdateCategoryMutation = graphql(`
  mutation UpdateCategory($id: Int!, $patch: UpdateCategoryPatchInput!) {
    updateCategory(input: { id: $id, patch: $patch }) {
      category {
        id
        name
        default
        includeInUpdate
        includeInDownload
      }
    }
  }
`);

export const DeleteCategoryMutation = graphql(`
  mutation DeleteCategory($categoryId: Int!) {
    deleteCategory(input: { categoryId: $categoryId }) {
      category {
        id
      }
    }
  }
`);

export const UpdateCategoryOrderMutation = graphql(`
  mutation UpdateCategoryOrder($id: Int!, $position: Int!) {
    updateCategoryOrder(input: { id: $id, position: $position }) {
      categories {
        id
        order
      }
    }
  }
`);

export const UpdateMangaCategoriesMutation = graphql(`
  mutation UpdateMangaCategories($id: Int!, $patch: UpdateMangaCategoriesPatchInput!) {
    updateMangaCategories(input: { id: $id, patch: $patch }) {
      manga {
        id
        categories {
          nodes {
            id
            name
          }
        }
      }
    }
  }
`);

export const ExtensionsQuery = graphql(`
  query Extensions {
    extensions(order: [{ by: NAME }]) {
      nodes {
        pkgName
        name
        lang
        versionName
        iconUrl
        isInstalled
        hasUpdate
        isObsolete
        contentWarning
        storeIndexUrl
        source {
          nodes {
            id
            displayName
            isConfigurable
          }
        }
      }
    }
  }
`);

export const FetchExtensionsMutation = graphql(`
  mutation FetchExtensions {
    fetchExtensions(input: {}) {
      extensions {
        pkgName
        hasUpdate
        isInstalled
      }
    }
  }
`);

export const UpdateExtensionMutation = graphql(`
  mutation UpdateExtension($id: String!, $patch: UpdateExtensionPatchInput!) {
    updateExtension(input: { id: $id, patch: $patch }) {
      extension {
        pkgName
        isInstalled
        hasUpdate
        versionName
      }
    }
  }
`);

export const ExtensionStoresQuery = graphql(`
  query ExtensionStores {
    extensionStores {
      nodes {
        indexUrl
        name
        badgeLabel
        contactWebsite
        isLegacy
      }
    }
  }
`);

export const AddExtensionStoreMutation = graphql(`
  mutation AddExtensionStore($indexUrl: String!) {
    addExtensionStore(input: { indexUrl: $indexUrl }) {
      extensionStore {
        indexUrl
        name
      }
    }
  }
`);

export const RemoveExtensionStoreMutation = graphql(`
  mutation RemoveExtensionStore($indexUrl: String!) {
    removeExtensionStore(input: { indexUrl: $indexUrl }) {
      extensionStore {
        indexUrl
      }
    }
  }
`);

export const SourceFiltersQuery = graphql(`
  query SourceFilters($id: LongString!) {
    source(id: $id) {
      id
      displayName
      filters {
        ...FilterFields
        ... on GroupFilter {
          name
          filters {
            ...FilterFields
          }
        }
      }
    }
  }

  fragment FilterFields on Filter {
    __typename
    ... on CheckBoxFilter {
      name
      checkBoxDefault: default
    }
    ... on TriStateFilter {
      name
      triStateDefault: default
    }
    ... on TextFilter {
      name
      textDefault: default
    }
    ... on SelectFilter {
      name
      values
      selectDefault: default
    }
    ... on SortFilter {
      name
      values
      sortDefault: default {
        index
        ascending
      }
    }
    ... on HeaderFilter {
      name
    }
    ... on SeparatorFilter {
      name
    }
  }
`);

export const SourcePreferencesQuery = graphql(`
  query SourcePreferences($id: LongString!) {
    source(id: $id) {
      id
      displayName
      isConfigurable
      preferences {
        ...PreferenceFields
      }
    }
  }

  fragment PreferenceFields on Preference {
    __typename
    ... on CheckBoxPreference {
      key
      title
      summary
      enabled
      visible
      checkBoxCurrent: currentValue
      checkBoxDefault: default
    }
    ... on SwitchPreference {
      key
      title
      summary
      enabled
      visible
      switchCurrent: currentValue
      switchDefault: default
    }
    ... on EditTextPreference {
      key
      title
      summary
      enabled
      visible
      dialogTitle
      dialogMessage
      editTextCurrent: currentValue
      editTextDefault: default
    }
    ... on ListPreference {
      key
      title
      summary
      enabled
      visible
      entries
      entryValues
      listCurrent: currentValue
      listDefault: default
    }
    ... on MultiSelectListPreference {
      key
      title
      summary
      enabled
      visible
      dialogTitle
      dialogMessage
      entries
      entryValues
      multiSelectCurrent: currentValue
      multiSelectDefault: default
    }
  }
`);

export const UpdateSourcePreferenceMutation = graphql(`
  mutation UpdateSourcePreference($source: LongString!, $change: SourcePreferenceChangeInput!) {
    updateSourcePreference(input: { source: $source, change: $change }) {
      source {
        id
      }
      preferences {
        ...PreferenceFields
      }
    }
  }
`);

export const BookmarkedChaptersQuery = graphql(`
  query BookmarkedChapters($first: Int) {
    chapters(
      filter: { isBookmarked: { equalTo: true } }
      order: [{ by: LAST_READ_AT, byType: DESC }]
      first: $first
    ) {
      totalCount
      nodes {
        id
        name
        chapterNumber
        mangaId
        isRead
        lastPageRead
        pageCount
        manga {
          id
          title
          thumbnailUrl
        }
      }
    }
  }
`);

export const UpdateChapterBookmarkMutation = graphql(`
  mutation UpdateChapterBookmark($id: Int!, $isBookmarked: Boolean!) {
    updateChapter(input: { id: $id, patch: { isBookmarked: $isBookmarked } }) {
      chapter {
        id
        isBookmarked
      }
    }
  }
`);
